import { query, queryOne, updateTgTimestamp } from '../../utils/db.js';

/**
 * Create an explanation for a characteristic
 */
export const createExplanation = async (data) => {
  const result = await query(
    `INSERT INTO TOC_Characteristic_Explanation (TOC_ID, Explaination_Text) VALUES (?, ?)`,
    [data.TOC_ID, data.Explaination_Text || '']
  );

  const explanation = await queryOne(
    `SELECT Char_Explanation_ID as Explanation_ID, TOC_ID, Explaination_Text
     FROM TOC_Characteristic_Explanation WHERE Char_Explanation_ID = ?`,
    [result.insertId]
  );
  
  // Update timestamp on successful create
  const char = await queryOne(
    `SELECT TG_ID FROM TG_Characteristics WHERE TOC_ID = ?`,
    [data.TOC_ID]
  );
  if (char?.TG_ID) {
    await updateTgTimestamp(char.TG_ID);
  }
  
  return explanation;
};

/**
 * Update explanation text
 */
export const updateExplanation = async (explId, data) => {
  if (data.Explaination_Text === undefined) return null;

  const result = await query(
    `UPDATE TOC_Characteristic_Explanation SET Explaination_Text = ? WHERE Char_Explanation_ID = ?`,
    [data.Explaination_Text, explId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    const expl = await queryOne(
      `SELECT c.TG_ID FROM TOC_Characteristic_Explanation e
       JOIN TG_Characteristics c ON e.TOC_ID = c.TOC_ID
       WHERE e.Char_Explanation_ID = ?`,
      [explId]
    );
    if (expl?.TG_ID) {
      await updateTgTimestamp(expl.TG_ID);
    }
  }
  
  return result.affectedRows > 0;
};

/**
 * Delete an explanation (cascades to individual explain docs)
 */
export const deleteExplanation = async (explId) => {
  // Get tgId before deleting
  const expl = await queryOne(
    `SELECT c.TG_ID FROM TOC_Characteristic_Explanation e
     JOIN TG_Characteristics c ON e.TOC_ID = c.TOC_ID
     WHERE e.Char_Explanation_ID = ?`,
    [explId]
  );
  
  await query(`DELETE FROM TOC_Explain_Indiv WHERE Char_Explanation_ID = ?`, [explId]);
  const result = await query(
    `DELETE FROM TOC_Characteristic_Explanation WHERE Char_Explanation_ID = ?`,
    [explId]
  );
  
  // Update timestamp on successful delete
  if (result.affectedRows > 0 && expl?.TG_ID) {
    await updateTgTimestamp(expl.TG_ID);
  }
  
  return result.affectedRows > 0;
};
