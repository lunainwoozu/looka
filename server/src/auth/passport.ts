import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getPool } from '../db/pool.js';
import type { AuthUser } from './types.js';

type UserRow = RowDataPacket & {
  id: number;
  google_id: string;
  email: string;
  nickname: string;
  created_at: Date;
};

let googleStrategyConfigured = false;

function isDuplicateEntryError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const mysqlError = error as { code?: string };
  return mysqlError.code === 'ER_DUP_ENTRY';
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 191);
}

function normalizeNickname(nickname: string, fallbackEmail: string): string {
  const trimmed = nickname.trim();
  if (!trimmed) {
    return fallbackEmail.split('@')[0]?.slice(0, 100) || 'user';
  }
  return trimmed.slice(0, 100);
}

async function findUserByGoogleId(pool: ReturnType<typeof getPool>, googleId: string): Promise<UserRow | null> {
  if (!pool) {
    throw new Error('MySQL is not configured');
  }
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT id, google_id, email, nickname, created_at FROM users WHERE google_id = ? LIMIT 1',
    [googleId]
  );
  return rows[0] ?? null;
}

export function hasGoogleOAuthConfig(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isGoogleStrategyConfigured(): boolean {
  return googleStrategyConfigured;
}

function getGoogleCallbackUrl(): string {
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  const port = Number(process.env.PORT) || 3001;
  return `http://localhost:${port}/api/auth/google/callback`;
}

async function upsertGoogleUser(googleId: string, email: string, nickname: string): Promise<AuthUser> {
  const pool = getPool();
  if (!pool) {
    throw new Error('MySQL is not configured');
  }

  const safeEmail = normalizeEmail(email);
  const safeNickname = normalizeNickname(nickname, safeEmail);
  const user = await findUserByGoogleId(pool, googleId);

  if (!user) {
    try {
      const [insertResult] = await pool.execute<ResultSetHeader>(
        'INSERT INTO users (google_id, email, nickname) VALUES (?, ?, ?)',
        [googleId, safeEmail, safeNickname]
      );
      return {
        id: insertResult.insertId,
        email: safeEmail,
        nickname: safeNickname,
      };
    } catch (error) {
      if (!isDuplicateEntryError(error)) {
        throw error;
      }

      const concurrentUser = await findUserByGoogleId(pool, googleId);
      if (!concurrentUser) {
        throw error;
      }

      if (concurrentUser.email !== safeEmail || concurrentUser.nickname !== safeNickname) {
        await pool.execute('UPDATE users SET email = ?, nickname = ? WHERE id = ?', [
          safeEmail,
          safeNickname,
          concurrentUser.id,
        ]);
      }

      return {
        id: concurrentUser.id,
        email: safeEmail,
        nickname: safeNickname,
      };
    }
  }

  if (user.email !== safeEmail || user.nickname !== safeNickname) {
    await pool.execute('UPDATE users SET email = ?, nickname = ? WHERE id = ?', [
      safeEmail,
      safeNickname,
      user.id,
    ]);
  }

  return {
    id: user.id,
    email: safeEmail,
    nickname: safeNickname,
  };
}

export function setupGooglePassportStrategy(): void {
  if (googleStrategyConfigured || !hasGoogleOAuthConfig()) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: getGoogleCallbackUrl(),
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            done(new Error('Google profile does not include an email'));
            return;
          }

          const profileEmailVerified = (profile._json as { email_verified?: unknown }).email_verified;
          if (profileEmailVerified !== true) {
            done(new Error('Google profile email is not verified'));
            return;
          }

          const nickname = profile.displayName ?? '';
          const user = await upsertGoogleUser(profile.id, email, nickname);
          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );

  googleStrategyConfigured = true;
}
