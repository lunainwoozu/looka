import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool | null {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT ?? 3307);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || !database || !Number.isInteger(port) || port <= 0) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool({
      host,
      port,
      user,
      password: password ?? '',
      database,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return pool;
}
