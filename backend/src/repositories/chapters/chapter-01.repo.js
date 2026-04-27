import { query, updateTgTimestamp } from '../../utils/db.js';

const ALLOWED_FIELDS = [
  'Sub_Add_Info',
  'Sub_check',
  'Sub_DD_Value',
  'Sub_OtherInfo',
  'Variety_Type',
  'SubjectClarificationIndicator',
  'SubjectSpeciesCategory',
];

/**
 * PATCH /api/test-guidelines/:id/chapters/01
 * Partial update of the main TG_Sub_Add_Info row (chapter 01).
 */
export const updateChapter01 = async (tgId, updates) => {
  const fields = Object.keys(updates).filter((f) => ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  const result = await query(
    `UPDATE TG_Sub_Add_Info SET ${setClauses} WHERE TG_ID = ? LIMIT 1`,
    [...values, tgId]
  );

  if (result.affectedRows > 0) {
    await updateTgTimestamp(tgId);
    return true;
  }

  const insertFields = ['TG_ID', ...fields];
  const insertValues = [tgId, ...values];

  const placeholders = insertFields.map(() => '?').join(', ');

  await query(
    `INSERT INTO TG_Sub_Add_Info (${insertFields.join(', ')})
     VALUES (${placeholders})`,
    insertValues
  );

  await updateTgTimestamp(tgId);

  return true;
};
export { ALLOWED_FIELDS };