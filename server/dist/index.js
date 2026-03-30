import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mysql from 'mysql2/promise';
import recommendRouter from './routes/recommend.js';
import tmdbRouter from './routes/tmdb.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();
const app = express();
const port = Number(process.env.PORT) || 3001;
app.use(cors({ origin: true }));
app.use(express.json());
app.use('/api/tmdb', tmdbRouter);
app.use('/api/recommend', recommendRouter);
let pool = null;
function getPool() {
    const host = process.env.MYSQL_HOST;
    const user = process.env.MYSQL_USER;
    const password = process.env.MYSQL_PASSWORD;
    const database = process.env.MYSQL_DATABASE;
    if (!host || !user || !database) {
        return null;
    }
    if (!pool) {
        pool = mysql.createPool({
            host,
            user,
            password: password ?? '',
            database,
            waitForConnections: true,
            connectionLimit: 10,
        });
    }
    return pool;
}
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
    }
    catch {
        res.status(503).json({ ok: false, db: 'error' });
    }
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express 4-arg error middleware
app.use((err, _req, res, _next) => {
    console.error(err);
    if (res.headersSent)
        return;
    res.status(500).json({ error: 'internal server error' });
});
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
