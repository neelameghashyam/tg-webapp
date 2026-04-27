import { query, updateTgTimestamp } from '../../utils/db.js';

const ALLOWED_FIELDS = [
  'Material_Supplied',
  'Min_Plant_Material',
  'SeedQualityReq',
  'Material_AddInfo',
];

/**
 * PATCH — update TG_Material fields
 */
export const updateChapter02 = async (tgId, updates) => {
  const fields = Object.keys(updates).filter((f) => ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  const result = await query(
    `UPDATE TG_Material SET ${setClauses} WHERE TG_ID = ? LIMIT 1`,
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
    `INSERT INTO TG_Material (${insertFields.join(', ')})
     VALUES (${placeholders})`,
    insertValues
  );

  await updateTgTimestamp(tgId);

  return true;
};

export { ALLOWED_FIELDS };