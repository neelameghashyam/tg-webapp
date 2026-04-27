import { query, queryOne, updateTgTimestamp } from '../../utils/db.js';

const CHAR_ALLOWED_FIELDS = [
  'TOC_Name',
  'Expression_Type',
  'ObservationM_PlotT',
  'GROWTH_STAGES',
  'Asterisk',
  'Grouping',
  'Grouping_Text',
  'Add_To_TQ5',
  'IsAdoptedTG',
  'IsAdoptedTGModify',
];

const EXPR_ALLOWED_FIELDS = [
  'State_of_Expression',
  'Expression_Notes',
  'Example_Varieties',
  'Expression_Notes_Row_Index',
];

/**
 * Create a new characteristic
 */
export const createCharacteristic = async (tgId, data) => {
  // Get next order number
  const maxRow = await queryOne(
    `SELECT COALESCE(MAX(CharacteristicOrder), 0) + 1 as nextOrder
     FROM TG_Characteristics WHERE TG_ID = ?`,
    [tgId]
  );
  const order = maxRow?.nextOrder || 1;

  const fields = Object.keys(data).filter((f) => CHAR_ALLOWED_FIELDS.includes(f));
  const columns = ['TG_ID', 'CharacteristicOrder', ...fields];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [tgId, order, ...fields.map((f) => data[f])];

  const result = await query(
    `INSERT INTO TG_Characteristics (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  const characteristic = await queryOne(
    `SELECT TOC_ID, CharacteristicOrder, TOC_Name, Expression_Type,
            ObservationM_PlotT, GROWTH_STAGES, Asterisk, Grouping,
            Add_To_TQ5, Grouping_Text, IsAdoptedTG, IsAdoptedTGModify
     FROM TG_Characteristics WHERE TOC_ID = ?`,
    [result.insertId]
  );
  
  // Update timestamp on successful create
  await updateTgTimestamp(tgId);
  
  return characteristic;
};

/**
 * Update a characteristic
 */
export const updateCharacteristic = async (charId, data) => {
  const fields = Object.keys(data).filter((f) => CHAR_ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f]);

  const result = await query(
    `UPDATE TG_Characteristics SET ${setClauses} WHERE TOC_ID = ?`,
    [...values, charId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    const char = await queryOne(
      `SELECT TG_ID FROM TG_Characteristics WHERE TOC_ID = ?`,
      [charId]
    );
    if (char?.TG_ID) {
      await updateTgTimestamp(char.TG_ID);
    }
  }
  
  return result.affectedRows > 0;
};

/**
 * Delete a characteristic and its expressions
 */
export const deleteCharacteristic = async (charId) => {
  // Get tgId before deleting
  const char = await queryOne(
    `SELECT TG_ID FROM TG_Characteristics WHERE TOC_ID = ?`,
    [charId]
  );
  
  await query(`DELETE FROM TOC_Expression_Notes WHERE TOC_ID = ?`, [charId]);
  const result = await query(`DELETE FROM TG_Characteristics WHERE TOC_ID = ?`, [charId]);
  
  // Update timestamp on successful delete
  if (result.affectedRows > 0 && char?.TG_ID) {
    await updateTgTimestamp(char.TG_ID);
  }
  
  return result.affectedRows > 0;
};

/**
 * Batch reorder characteristics
 */
export const reorderCharacteristics = async (tgId, order) => {
  for (const item of order) {
    await query(
      `UPDATE TG_Characteristics SET CharacteristicOrder = ?
       WHERE TOC_ID = ? AND TG_ID = ?`,
      [item.CharacteristicOrder, item.TOC_ID, tgId]
    );
  }
  
  // Update timestamp after reordering
  await updateTgTimestamp(tgId);
  
  return true;
};

/**
 * Create an expression note
 */
export const createExpression = async (charId, data) => {
  // Get next row index for this characteristic
  const maxRow = await queryOne(
    `SELECT COALESCE(MAX(Expression_Notes_Row_Index), 0) + 1 as nextIndex
     FROM TOC_Expression_Notes WHERE TOC_ID = ?`,
    [charId]
  );
  const rowIndex = data.Expression_Notes_Row_Index ?? maxRow?.nextIndex ?? 1;

  const fields = Object.keys(data).filter((f) => EXPR_ALLOWED_FIELDS.includes(f));
  const columns = ['TOC_ID', 'Expression_Notes_Row_Index', ...fields];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [charId, rowIndex, ...fields.map((f) => data[f])];

  const result = await query(
    `INSERT INTO TOC_Expression_Notes (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  const expression = await queryOne(
    `SELECT Expression_Notes_ID as TOC_Expression_Notes_ID, TOC_ID,
            State_of_Expression, Expression_Notes, Example_Varieties,
            Expression_Notes_Row_Index
     FROM TOC_Expression_Notes WHERE Expression_Notes_ID = ?`,
    [result.insertId]
  );
  
  // Update timestamp on successful create
  const char = await queryOne(
    `SELECT TG_ID FROM TG_Characteristics WHERE TOC_ID = ?`,
    [charId]
  );
  if (char?.TG_ID) {
    await updateTgTimestamp(char.TG_ID);
  }
  
  return expression;
};

/**
 * Update an expression note
 */
export const updateExpression = async (exprId, data) => {
  const fields = Object.keys(data).filter((f) => EXPR_ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f]);

  const result = await query(
    `UPDATE TOC_Expression_Notes SET ${setClauses} WHERE Expression_Notes_ID = ?`,
    [...values, exprId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    const expr = await queryOne(
      `SELECT c.TG_ID FROM TOC_Expression_Notes e
       JOIN TG_Characteristics c ON e.TOC_ID = c.TOC_ID
       WHERE e.Expression_Notes_ID = ?`,
      [exprId]
    );
    if (expr?.TG_ID) {
      await updateTgTimestamp(expr.TG_ID);
    }
  }
  
  return result.affectedRows > 0;
};

/**
 * Delete an expression note
 */
export const deleteExpression = async (exprId) => {
  // Get tgId before deleting
  const expr = await queryOne(
    `SELECT c.TG_ID FROM TOC_Expression_Notes e
     JOIN TG_Characteristics c ON e.TOC_ID = c.TOC_ID
     WHERE e.Expression_Notes_ID = ?`,
    [exprId]
  );
  
  const result = await query(
    `DELETE FROM TOC_Expression_Notes WHERE Expression_Notes_ID = ?`,
    [exprId]
  );
  
  // Update timestamp on successful delete
  if (result.affectedRows > 0 && expr?.TG_ID) {
    await updateTgTimestamp(expr.TG_ID);
  }
  
  return result.affectedRows > 0;
};

/**
 * Search adopted characteristics
 */
export const searchAdopted = async (searchQuery, limit = 20) => {
  return query(
    `SELECT
      AdoptedTgId as id,
      CharNameENG as name,
      TgNameENG as genus,
      ObservationMethods as methods,
      ExpressionType as type,
      TgRef as tgRef,
      StateOfExpressionNotesENG as statesOfExpression
    FROM AdoptedTg
    WHERE CharNameENG LIKE ?
    ORDER BY CharNameENG
    LIMIT ?`,
    [`%${searchQuery}%`, limit]
  );
};

export { CHAR_ALLOWED_FIELDS, EXPR_ALLOWED_FIELDS };
