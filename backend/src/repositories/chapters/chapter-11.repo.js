import { query, updateTgTimestamp } from '../../utils/db.js';

const ALLOWED_FIELDS = ['annexRefData'];

/**
 * PATCH /api/test-guidelines/:id/chapters/11
 * Upsert annex content on TG_Annex.
 * Inserts a new row if none exists for this TG_ID, otherwise updates.
 */
export const updateChapter11 = async (tgId, updates) => {
  const fields = Object.keys(updates).filter((f) => ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  const updateResult = await query(
    `UPDATE TG_Annex SET ${setClauses} WHERE TG_ID = ?`,
    [...values, tgId]
  );

  if (updateResult.affectedRows > 0) {
    await updateTgTimestamp(tgId);
    return true;
  }

  // No existing row — insert
  const insertFields = ['TG_ID', ...fields];
  const insertValues = [tgId, ...fields.map((f) => updates[f])];
  const placeholders = insertFields.map(() => '?').join(', ');

  await query(
    `INSERT INTO TG_Annex (${insertFields.join(', ')}) VALUES (${placeholders})`,
    insertValues
  );
  await updateTgTimestamp(tgId);
  return true;
};

export { ALLOWED_FIELDS };