import mysql from 'mysql2/promise';

let pool = null;

/**
 * Get database connection pool
 * Reuses connection across Lambda warm invocations
 * Configures timezone to UTC for consistent timestamp handling
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
      timezone: 'Z', // Use UTC timezone (Z = +00:00)
    });
  }
  return pool;
};

/**
 * Execute a query with parameters
 */
export const query = async (sql, params = []) => {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Get a single row
 */
export const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

/**
 * Update the TG_lastupdated timestamp for a test guideline
 * This should be called after any chapter or related entity is modified
 * Stores the timestamp in UTC format
 * 
 * @param {number} tgId - The test guideline ID
 * @returns {Promise<boolean>} - true if the update was successful
 */
export const updateTgTimestamp = async (tgId) => {
  const result = await query(
    `UPDATE TG SET TG_lastupdated = UTC_TIMESTAMP() WHERE TG_ID = ? AND Status_Code != 'DEL' LIMIT 1`,
    [tgId]
  );
  return result.affectedRows > 0;
};
