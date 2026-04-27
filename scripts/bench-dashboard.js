/**
 * Benchmark: /api/dashboard/stats endpoint performance
 * Measures current countByTwp (5 separate queries) vs merged single query.
 *
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/bench-dashboard.js
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const dotenv = require('../backend/node_modules/dotenv');
const mysql = require('../backend/node_modules/mysql2/promise');

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const { createPool } = mysql;

const pool = createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  connectionLimit: 5,
});

const INACTIVE_STATUSES = ['DEL', 'STU', 'ADT', 'ABT', 'SSD', 'ARC'];
const TABS = {
  active:    `AND tg.Status_Code NOT IN (${INACTIVE_STATUSES.map(() => '?').join(', ')})`,
  adopted:   `AND tg.Status_Code = 'ADT'`,
  archived:  `AND tg.Status_Code = 'ARC'`,
  submitted: `AND tg.Status_Code = 'STU'`,
  aborted:   `AND tg.Status_Code = 'ABT'`,
};

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// --- Current approach: 5 separate countByTwp queries ---
async function currentApproach() {
  const promises = Object.entries(TABS).map(async ([tab, filter]) => {
    const params = tab === 'active' ? INACTIVE_STATUSES : [];
    const sql = `
      SELECT utwp.TWP as twp, COUNT(DISTINCT tg.TG_ID) as count
      FROM TG tg
      JOIN TG_UPOVCode tuc ON tg.TG_ID = tuc.TG_ID
      JOIN Upov_Code uc ON tuc.UpovCode_ID = uc.UpovCode_ID
      JOIN upovcode_twp utwp ON utwp.UPOV_CODE = uc.Upov_Code
      WHERE tg.Status_Code != 'DEL'
      ${filter}
      AND utwp.TWP IS NOT NULL
      GROUP BY utwp.TWP`;
    const rows = await query(sql, params);
    const counts = {};
    for (const r of rows) counts[r.twp] = r.count;
    return [tab, counts];
  });
  return Object.fromEntries(await Promise.all(promises));
}

// --- Proposed approach: 1 merged query ---
async function mergedApproach() {
  const sql = `
    SELECT tg.Status_Code as status, utwp.TWP as twp, COUNT(DISTINCT tg.TG_ID) as cnt
    FROM TG tg
    JOIN TG_UPOVCode tuc ON tg.TG_ID = tuc.TG_ID
    JOIN Upov_Code uc ON tuc.UpovCode_ID = uc.UpovCode_ID
    JOIN upovcode_twp utwp ON utwp.UPOV_CODE = uc.Upov_Code
    WHERE tg.Status_Code != 'DEL'
    AND utwp.TWP IS NOT NULL
    GROUP BY tg.Status_Code, utwp.TWP`;
  const rows = await query(sql);

  // Pivot in JS (same logic the handler will use)
  const result = { active: {}, adopted: {}, archived: {}, submitted: {}, aborted: {} };
  for (const { status, twp, cnt } of rows) {
    if (!INACTIVE_STATUSES.includes(status)) {
      result.active[twp] = (result.active[twp] || 0) + cnt;
    }
    if (status === 'ADT') result.adopted[twp] = cnt;
    if (status === 'ARC') result.archived[twp] = cnt;
    if (status === 'STU') result.submitted[twp] = cnt;
    if (status === 'ABT') result.aborted[twp] = cnt;
  }
  return result;
}

// --- Benchmark runner ---
async function bench(name, fn, iterations = 5) {
  // Warmup
  await fn();

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result = await fn();
    const elapsed = performance.now() - start;
    times.push(elapsed);
    if (i === 0) console.log(`  Sample result:`, JSON.stringify(result).slice(0, 120) + '...');
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  console.log(`  ${name}: avg=${avg.toFixed(0)}ms  min=${min.toFixed(0)}ms  max=${max.toFixed(0)}ms  (${iterations} runs)`);
  return avg;
}

// --- Current approach run sequentially (no Promise.all) ---
async function currentSequential() {
  const result = {};
  for (const [tab, filter] of Object.entries(TABS)) {
    const params = tab === 'active' ? INACTIVE_STATUSES : [];
    const sql = `
      SELECT utwp.TWP as twp, COUNT(DISTINCT tg.TG_ID) as count
      FROM TG tg
      JOIN TG_UPOVCode tuc ON tg.TG_ID = tuc.TG_ID
      JOIN Upov_Code uc ON tuc.UpovCode_ID = uc.UpovCode_ID
      JOIN upovcode_twp utwp ON utwp.UPOV_CODE = uc.Upov_Code
      WHERE tg.Status_Code != 'DEL'
      ${filter}
      AND utwp.TWP IS NOT NULL
      GROUP BY utwp.TWP`;
    const rows = await query(sql, params);
    const counts = {};
    for (const r of rows) counts[r.twp] = r.count;
    result[tab] = counts;
  }
  return result;
}

console.log('\n=== Dashboard countByTwp Benchmark ===\n');

const avgParallel = await bench('Current  (5 parallel) ', currentApproach);
console.log('');
const avgSeq = await bench('Current  (5 sequential)', currentSequential);
console.log('');
const avgMerged = await bench('Merged   (1 query)    ', mergedApproach);

console.log('\n--- Summary ---');
console.log(`5 parallel:  ${avgParallel.toFixed(0)}ms`);
console.log(`5 sequential: ${avgSeq.toFixed(0)}ms`);
console.log(`1 merged:     ${avgMerged.toFixed(0)}ms`);
console.log(`\nMerged vs parallel:   ${(avgParallel / avgMerged).toFixed(2)}x  (${(avgParallel - avgMerged).toFixed(0)}ms saved)`);
console.log(`Merged vs sequential: ${(avgSeq / avgMerged).toFixed(2)}x  (${(avgSeq - avgMerged).toFixed(0)}ms saved)`);
console.log(`DB load reduction:    5 queries → 1 query (80% fewer round trips)\n`);

await pool.end();
