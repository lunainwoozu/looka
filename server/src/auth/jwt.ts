import jwt, { type JwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { AuthUser, TokenPayload } from './types.js';

export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60; // 1h
export const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7d

export function hasJwtSecret(): boolean {
  return Boolean(process.env.JWT_SECRET);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

function getJwtIssuer(): string {
  return process.env.JWT_ISSUER ?? 'looka-api';
}

function getJwtAudience(): string {
  return process.env.JWT_AUDIENCE ?? 'looka-client';
}

function buildTokenPayload(user: AuthUser, tokenType: TokenPayload['tokenType']): TokenPayload {
  return { id: user.id, email: user.email, nickname: user.nickname, tokenType };
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(buildTokenPayload(user, 'access'), getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    subject: String(user.id),
    issuer: getJwtIssuer(),
    audience: getJwtAudience(),
    jwtid: randomUUID(),
  });
}

export function signRefreshToken(user: AuthUser): string {
  return jwt.sign(buildTokenPayload(user, 'refresh'), getJwtSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    subject: String(user.id),
    issuer: getJwtIssuer(),
    audience: getJwtAudience(),
    jwtid: randomUUID(),
  });
}

function normalizePayload(decoded: string | JwtPayload): TokenPayload | null {
  if (typeof decoded !== 'object' || decoded === null) return null;

  const { id, email, nickname, tokenType } = decoded as Partial<TokenPayload>;
  if (
    typeof id !== 'number' ||
    !Number.isFinite(id) ||
    typeof email !== 'string' ||
    typeof nickname !== 'string' ||
    (tokenType !== 'access' && tokenType !== 'refresh')
  ) {
    return null;
  }

  return { id, email, nickname, tokenType };
}

function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, getJwtSecret(), {
    issuer: getJwtIssuer(),
    audience: getJwtAudience(),
  });
  const payload = normalizePayload(decoded);
  if (!payload) throw new Error('Invalid token payload');

  const subject = (decoded as JwtPayload).sub;
  const subjectUserId = typeof subject === 'string' ? Number(subject) : NaN;
  if (!Number.isFinite(subjectUserId) || subjectUserId !== payload.id) {
    throw new Error('Invalid token subject');
  }

  return payload;
}

export function verifyAccessToken(token: string): AuthUser {
  const payload = verifyToken(token);
  if (payload.tokenType !== 'access') throw new Error('Expected access token');
  return { id: payload.id, email: payload.email, nickname: payload.nickname };
}

export function verifyRefreshToken(token: string): AuthUser {
  const payload = verifyToken(token);
  if (payload.tokenType !== 'refresh') throw new Error('Expected refresh token');
  return { id: payload.id, email: payload.email, nickname: payload.nickname };
}
