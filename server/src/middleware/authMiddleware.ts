import type { NextFunction, Request, Response } from 'express';
import { hasJwtSecret, verifyAccessToken } from '../auth/jwt.js';
import type { AuthRequest } from '../auth/types.js';

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;
  const parts = authorizationHeader.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authReq = req as AuthRequest;
  authReq.user = null;

  if (!hasJwtSecret()) {
    next();
    return;
  }

  const token = extractBearerToken(req.header('authorization'));
  if (!token) {
    next();
    return;
  }

  try {
    authReq.user = verifyAccessToken(token);
  } catch {
    authReq.user = null;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = (req as Partial<AuthRequest>).user ?? null;
  if (!user) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}
