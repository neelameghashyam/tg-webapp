import mysql from 'mysql2/promise';

let pool = null;

/**
 * Get database connection pool
 */
export const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'upovtg',
      waitForConnections: true,
      connectionLimit: 1,
      charset: 'utf8mb4',
    });
  }
  return pool;
};

/**
 * Execute a query
 */
export const query = async (sql, params = []) => {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Execute an update/insert
 */
export const execute = async (sql, params = []) => {
  const pool = getPool();
  const [result] = await pool.execute(sql, params);
  return result;
};
