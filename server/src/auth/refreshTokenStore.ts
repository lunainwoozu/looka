import { createHash } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool } from '../db/pool.js';

type SaveRefreshTokenInput = {
  userId: number;
  token: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
};

type RefreshTokenRow = RowDataPacket & {
  id: number;
  user_id: number;
};

type RotateRefreshTokenInput = {
  userId: number;
  currentToken: string;
  newToken: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
};

function getRequiredPool() {
  const pool = getPool();
  if (!pool) {
    throw new Error('MySQL is not configured');
  }
  return pool;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function saveRefreshToken(input: SaveRefreshTokenInput): Promise<void> {
  const pool = getRequiredPool();
  const tokenHash = hashToken(input.token);
  await pool.execute(
    `INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?)`,
    [input.userId, tokenHash, input.expiresAt, input.userAgent, input.ipAddress]
  );
}

export async function rotateRefreshToken(input: RotateRefreshTokenInput): Promise<boolean> {
  const pool = getRequiredPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentTokenHash = hashToken(input.currentToken);
    const [rows] = await connection.execute<RefreshTokenRow[]>(
      `SELECT id, user_id
       FROM user_refresh_tokens
       WHERE token_hash = ?
         AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP()
       LIMIT 1
       FOR UPDATE`,
      [currentTokenHash]
    );

    if (rows.length === 0 || rows[0].user_id !== input.userId) {
      await connection.rollback();
      return false;
    }

    const newTokenHash = hashToken(input.newToken);

    await connection.execute(
      `INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [input.userId, newTokenHash, input.expiresAt, input.userAgent, input.ipAddress]
    );

    const [revokeResult] = await connection.execute<ResultSetHeader>(
      `UPDATE user_refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP(),
           replaced_by_token_hash = ?
       WHERE id = ?
         AND revoked_at IS NULL`,
      [newTokenHash, rows[0].id]
    );

    if (revokeResult.affectedRows !== 1) {
      throw new Error('refresh_token_rotation_failed');
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
