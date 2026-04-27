import { query, updateTgTimestamp } from '../../utils/db.js';

const ALLOWED_FIELDS = [
  'isCharacteristicsLegend',
  'CharacteristicLegend',
  'isExampleVarietyText',
  'ExampleVarietyText',
];

/**
 * PATCH /api/test-guidelines/:id/chapters/06
 * Update characteristic intro flags/text on the TG row.
 */
export const updateChapter06 = async (tgId, updates) => {
  const fields = Object.keys(updates).filter((f) => ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  const result = await query(
    `UPDATE TG SET ${setClauses} WHERE TG_ID = ? AND Status_Code != 'DEL'`,
    [...values, tgId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    await updateTgTimestamp(tgId);
  }
  
  return result.affectedRows > 0;
};

export { ALLOWED_FIELDS };
