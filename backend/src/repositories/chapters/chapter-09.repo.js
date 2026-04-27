import { query, queryOne, updateTgTimestamp } from '../../utils/db.js';

const ALLOWED_FIELDS = ['LiteratureReferences'];

/**
 * PATCH /api/test-guidelines/:id/chapters/09
 * Upsert TG_Literature — INSERT if no row exists for TG_ID, UPDATE otherwise.
 */
export const updateChapter09 = async (tgId, updates) => {
  const fields = Object.keys(updates).filter((f) => ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const existing = await queryOne(
    'SELECT Literature_ID FROM TG_Literature WHERE TG_ID = ? LIMIT 1',
    [tgId]
  );

  let result;

  if (existing) {
    const setClauses = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => updates[f]);
    result = await query(
      `UPDATE TG_Literature SET ${setClauses} WHERE TG_ID = ? LIMIT 1`,
      [...values, tgId]
    );
  } else {
    const columns = ['TG_ID', ...fields];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [tgId, ...fields.map((f) => updates[f])];
    result = await query(
      `INSERT INTO TG_Literature (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }

  const success = (result.affectedRows ?? 0) > 0 || (result.insertId ?? 0) > 0;
  if (success) await updateTgTimestamp(tgId);
  return success;
};

export { ALLOWED_FIELDS };