import { query, queryOne } from '../utils/db.js';

/**
 * List all ASW data details, optionally filtered by ASW name
 */
export const findAll = async (aswName = null) => {
  let sql = `
    SELECT
      d.ASW_Data_Details_ID as id,
      a.ASW_ID as aswId,
      a.ASW_Name as aswName,
      d.ASW_Code as code,
      d.ASW_Sub_Code as subCode,
      d.ASW_Alternative as alternative,
      d.ASW_Desc as description,
      d.ASW_Desc_Mushroom as descriptionMushroom
    FROM ASW_Data_Details d
    JOIN ASW_Data a ON d.ASW_ID = a.ASW_ID`;
  const params = [];

  if (aswName) {
    sql += ' WHERE a.ASW_Name = ?';
    params.push(aswName);
  }

  sql += ' ORDER BY a.ASW_Name + 0, a.ASW_Name, d.ASW_Code, d.ASW_Sub_Code, d.ASW_Alternative';
  return query(sql, params);
};

/**
 * Get a single ASW data detail by ID
 */
export const findById = async (id) => {
  return queryOne(
    `SELECT
      d.ASW_Data_Details_ID as id,
      a.ASW_ID as aswId,
      a.ASW_Name as aswName,
      d.ASW_Code as code,
      d.ASW_Sub_Code as subCode,
      d.ASW_Alternative as alternative,
      d.ASW_Desc as description,
      d.ASW_Desc_Mushroom as descriptionMushroom
    FROM ASW_Data_Details d
    JOIN ASW_Data a ON d.ASW_ID = a.ASW_ID
    WHERE d.ASW_Data_Details_ID = ?`,
    [id]
  );
};

/**
 * Get lookup options: ASW names, codes, subcodes, alternatives
 */
export const findOptions = async () => {
  const [names, codes, subCodes, alternatives] = await Promise.all([
    query('SELECT ASW_Name as value FROM ASW_Name ORDER BY ASW_Name + 0, ASW_Name'),
    query('SELECT ASW_Code as value FROM ASW_Code ORDER BY ASW_Code_ID'),
    query('SELECT ASW_SubCode as value FROM ASW_SubCode ORDER BY ASW_SubCode_ID'),
    query('SELECT ASW_Alternative as value FROM ASW_Alternative ORDER BY ASW_Alternative_ID'),
  ]);
  return {
    names: names.map((r) => r.value),
    codes: codes.map((r) => r.value),
    subCodes: subCodes.map((r) => r.value),
    alternatives: alternatives.map((r) => r.value),
  };
};

/**
 * Get distinct ASW names that have data entries
 */
export const findUsedNames = async () => {
  const rows = await query(
    `SELECT DISTINCT a.ASW_Name as name
     FROM ASW_Data a
     JOIN ASW_Data_Details d ON a.ASW_ID = d.ASW_ID
     ORDER BY a.ASW_Name + 0, a.ASW_Name`
  );
  return rows.map((r) => r.name);
};

/**
 * Update an ASW data detail's description
 */
export const update = async (id, data) => {
  const fields = [];
  const params = [];

  if ('description' in data) {
    fields.push('ASW_Desc = ?');
    params.push(data.description || null);
  }
  if ('descriptionMushroom' in data) {
    fields.push('ASW_Desc_Mushroom = ?');
    params.push(data.descriptionMushroom || null);
  }

  if (fields.length === 0) return;
  params.push(id);
  await query(`UPDATE ASW_Data_Details SET ${fields.join(', ')} WHERE ASW_Data_Details_ID = ?`, params);
};

/**
 * Create a new ASW data entry (parent + detail)
 */
export const create = async (data) => {
  // Find or create the parent ASW_Data record
  let parent = await queryOne(
    'SELECT ASW_ID as id FROM ASW_Data WHERE ASW_Name = ?',
    [data.aswName]
  );

  if (!parent) {
    const result = await query(
      'INSERT INTO ASW_Data (ASW_Name) VALUES (?)',
      [data.aswName]
    );
    parent = { id: result.insertId };
  }

  // Check for duplicate detail
  const existing = await queryOne(
    `SELECT ASW_Data_Details_ID as id FROM ASW_Data_Details
     WHERE ASW_ID = ? AND ASW_Code = ? AND ASW_Sub_Code = ? AND ASW_Alternative = ?`,
    [parent.id, data.code || '-1', data.subCode || '-1', data.alternative || '-1']
  );
  if (existing) return null;

  const result = await query(
    `INSERT INTO ASW_Data_Details (ASW_ID, ASW_Code, ASW_Sub_Code, ASW_Alternative, ASW_Desc, ASW_Desc_Mushroom)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [parent.id, data.code || '-1', data.subCode || '-1', data.alternative || '-1', data.description || null, data.descriptionMushroom || null]
  );
  return result.insertId;
};

/**
 * Delete an ASW data detail
 */
export const remove = async (id) => {
  await query('DELETE FROM ASW_Data_Details WHERE ASW_Data_Details_ID = ?', [id]);
};
