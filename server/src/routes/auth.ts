import type { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import passport from 'passport';
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  hasJwtSecret,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../auth/jwt.js';
import {
  hasGoogleOAuthConfig,
  isGoogleStrategyConfigured,
  setupGooglePassportStrategy,
} from '../auth/passport.js';
import {
  rotateRefreshToken,
  saveRefreshToken,
} from '../auth/refreshTokenStore.js';
import type { AuthRequest, AuthUser } from '../auth/types.js';
import { getPool } from '../db/pool.js';
import { authMiddleware, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

type RefreshBody = {
  refreshToken?: unknown;
};

const OAUTH_STATE_TTL_MS = 5 * 60 * 1_000;
const oauthStateStore = new Map<string, number>();

function createOAuthState(): string {
  const now = Date.now();
  for (const [state, expiresAt] of oauthStateStore.entries()) {
    if (expiresAt <= now) {
      oauthStateStore.delete(state);
    }
  }

  const state = randomBytes(24).toString('hex');
  oauthStateStore.set(state, now + OAUTH_STATE_TTL_MS);
  return state;
}

function consumeOAuthState(state: string): boolean {
  const expiresAt = oauthStateStore.get(state);
  if (!expiresAt) return false;

  oauthStateStore.delete(state);
  return expiresAt > Date.now();
}

function getRefreshExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1_000);
}

function extractIpAddress(req: Request): string | null {
  return req.ip ? req.ip.slice(0, 45) : null;
}

function extractUserAgent(req: Request): string | null {
  const userAgent = req.header('user-agent');
  if (!userAgent) return null;
  return userAgent.slice(0, 255);
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const user = value as Partial<AuthUser>;
  return (
    typeof user.id === 'number' &&
    Number.isFinite(user.id) &&
    typeof user.email === 'string' &&
    typeof user.nickname === 'string'
  );
}

function ensureGoogleLoginReady(_req: Request, res: Response, next: NextFunction): void {
  if (!hasGoogleOAuthConfig()) {
    res.status(503).json({
      error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured',
    });
    return;
  }

  if (!hasJwtSecret()) {
    res.status(503).json({
      error: 'JWT_SECRET must be configured',
    });
    return;
  }

  if (!getPool()) {
    res.status(503).json({
      error: 'MySQL is not configured',
    });
    return;
  }

  if (!isGoogleStrategyConfigured()) {
    setupGooglePassportStrategy();
  }

  next();
}

router.get('/google', ensureGoogleLoginReady, (req, res, next) => {
  const state = createOAuthState();
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state,
  })(req, res, next);
});

router.get('/google/callback', ensureGoogleLoginReady, (req, res, next) => {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (!consumeOAuthState(state)) {
    res.status(401).json({ error: 'invalid_oauth_state' });
    return;
  }

  passport.authenticate(
    'google',
    { session: false },
    async (err: unknown, user: unknown) => {
      if (err) {
        next(err);
        return;
      }

      if (!isAuthUser(user)) {
        res.status(401).json({ error: 'google_auth_failed' });
        return;
      }

      try {
        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);
        await saveRefreshToken({
          userId: user.id,
          token: refreshToken,
          expiresAt: getRefreshExpiresAt(),
          userAgent: extractUserAgent(req),
          ipAddress: extractIpAddress(req),
        });
        res.json({
          user,
          accessToken,
          refreshToken,
          accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
          refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
        });
      } catch (saveError) {
        next(saveError);
      }
    }
  )(req, res, next);
});

router.post('/refresh', async (req, res, next) => {
  if (!hasJwtSecret()) {
    res.status(503).json({
      error: 'JWT_SECRET must be configured',
    });
    return;
  }

  if (!getPool()) {
    res.status(503).json({
      error: 'MySQL is not configured',
    });
    return;
  }

  const { refreshToken } = req.body as RefreshBody;
  if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
    res.status(400).json({
      error: 'refreshToken is required',
    });
    return;
  }

  let user: AuthUser;
  try {
    user = verifyRefreshToken(refreshToken);
  } catch {
    res.status(401).json({
      error: 'invalid_refresh_token',
    });
    return;
  }

  try {
    const newRefreshToken = signRefreshToken(user);
    const rotated = await rotateRefreshToken({
      userId: user.id,
      currentToken: refreshToken,
      newToken: newRefreshToken,
      expiresAt: getRefreshExpiresAt(),
      userAgent: extractUserAgent(req),
      ipAddress: extractIpAddress(req),
    });

    if (!rotated) {
      res.status(401).json({
        error: 'invalid_refresh_token',
      });
      return;
    }

    const accessToken = signAccessToken(user);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authMiddleware, requireAuth, (req, res) => {
  const user = (req as AuthRequest).user;
  res.json({ user });
});

export default router;
