#!/usr/bin/env node
/**
 * Run an arbitrary SQL query against the dev database.
 *
 * Usage:  node scripts/query.js "SELECT * FROM User_Profile LIMIT 5"
 *         node scripts/query.js "DELETE FROM User_Profile WHERE User_ID = 123"
 *
 * Connects using the same .env at the repo root that the backend uses.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const dotenv = require('../backend/node_modules/dotenv');
const mysql = require('../backend/node_modules/mysql2/promise');

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const sql = process.argv[2];
if (!sql) {
  console.error('Usage: node scripts/query.js "<SQL>"');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'upovtg',
  connectionLimit: 1,
});

try {
  const [rows] = await pool.execute(sql);

  if (Array.isArray(rows)) {
    if (rows.length === 0) {
      console.log('(empty result set)');
    } else {
      console.table(rows);
      console.log(`${rows.length} row(s)`);
    }
  } else {
    console.log(`OK — ${rows.affectedRows} row(s) affected, insertId: ${rows.insertId}`);
  }
} catch (err) {
  console.error('Query error:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
