import { query, updateTgTimestamp } from '../../utils/db.js';

/**
 * Cover page fields that can be patched via PATCH /api/test-guidelines/:id/chapters/00.
 *
 * Both fields live directly on the TG table:
 *   - TG_Name          → Main Common Name(s)
 *   - Name_AssoDocInfo → Associated UPOV documents (rich text)
 */
const ALLOWED_FIELDS = ['TG_Name', 'Name_AssoDocInfo'];

/**
 * Partial update of the TG row for cover-page fields.
 *
 * @param {number} tgId
 * @param {Record<string, any>} updates  — only keys present in ALLOWED_FIELDS are written
 * @returns {Promise<boolean>}           — true when at least one row was affected
 */
export const updateChapter00 = async (tgId, updates) => {
  const fields = Object.keys(updates).filter((f) => ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  const result = await query(
    `UPDATE TG SET ${setClauses} WHERE TG_ID = ? AND Status_Code != 'DEL' LIMIT 1`,
    [...values, tgId]
  );

  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    await updateTgTimestamp(tgId);
  }

  return result.affectedRows > 0;
};

export { ALLOWED_FIELDS };