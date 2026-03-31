import type { Request } from 'express';

export type AuthUser = {
  id: number;
  email: string;
  nickname: string;
};

export type AuthRequest = Omit<Request, 'user'> & {
  user: AuthUser | null;
};

export type TokenPayload = AuthUser & {
  tokenType: 'access' | 'refresh';
};

export type DbUser = {
  id: number;
  googleId: string;
  email: string;
  nickname: string;
  createdAt: Date;
};
