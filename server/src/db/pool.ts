import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool | null {
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
