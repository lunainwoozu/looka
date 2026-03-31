import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';
import { setupGooglePassportStrategy } from './auth/passport.js';
import { getPool } from './db/pool.js';
import authRouter from './routes/auth.js';
import recommendRouter from './routes/recommend.js';
import tmdbRouter from './routes/tmdb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

setupGooglePassportStrategy();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(passport.initialize());

app.use('/api/auth', authRouter);
app.use('/api/tmdb', tmdbRouter);
app.use('/api/recommend', recommendRouter);

app.get('/api/health', async (_req, res) => {
  const p = getPool();
  if (!p) {
    res.json({ ok: true, db: 'not_configured' });
    return;
  }
  try {
    const conn = await p.getConnection();
    await conn.ping();
    conn.release();
    res.json({ ok: true, db: 'connected' });
  } catch {
    res.status(503).json({ ok: false, db: 'error' });
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express 4-arg error middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'internal server error' });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
