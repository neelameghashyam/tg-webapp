import { query, queryOne, updateTgTimestamp } from '../../utils/db.js';

/**
 * Create a new paragraph (TG_Sub_Add_Info row)
 */
export const createParagraph = async (tgId, content) => {
  const result = await query(
    `INSERT INTO TG_Sub_Add_Info (TG_ID, Sub_Add_Info, Created_Time, Modified_Time)
     VALUES (?, ?, NOW(), NOW())`,
    [tgId, content || '']
  );
  const paragraph = await queryOne(
    `SELECT Sub_Add_Id, Sub_Add_Info, TG_ID FROM TG_Sub_Add_Info WHERE Sub_Add_Id = ?`,
    [result.insertId]
  );
  
  // Update timestamp on successful create
  await updateTgTimestamp(tgId);
  
  return paragraph;
};

/**
 * Update paragraph content
 */
export const updateParagraph = async (pId, content) => {
  const result = await query(
    `UPDATE TG_Sub_Add_Info SET Sub_Add_Info = ?, Modified_Time = NOW() WHERE Sub_Add_Id = ?`,
    [content, pId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    const paragraph = await queryOne(
      `SELECT TG_ID FROM TG_Sub_Add_Info WHERE Sub_Add_Id = ?`,
      [pId]
    );
    if (paragraph?.TG_ID) {
      await updateTgTimestamp(paragraph.TG_ID);
    }
  }
  
  return result.affectedRows > 0;
};

/**
 * Delete a paragraph — only allows deleting "extra" paragraph rows,
 * not the main ch01 row (protected by checking it's not the first row for the TG).
 */
export const deleteParagraph = async (tgId, pId) => {
  // Find the main ch01 row (smallest Sub_Add_Id for this TG)
  const mainRow = await queryOne(
    `SELECT MIN(Sub_Add_Id) as minId FROM TG_Sub_Add_Info WHERE TG_ID = ?`,
    [tgId]
  );

  // Don't allow deleting the main ch01 row
  if (mainRow && mainRow.minId === pId) {
    return false;
  }

  const result = await query(
    `DELETE FROM TG_Sub_Add_Info WHERE Sub_Add_Id = ? AND TG_ID = ?`,
    [pId, tgId]
  );
  
  // Update timestamp on successful delete
  if (result.affectedRows > 0) {
    await updateTgTimestamp(tgId);
  }
  
  return result.affectedRows > 0;
};
