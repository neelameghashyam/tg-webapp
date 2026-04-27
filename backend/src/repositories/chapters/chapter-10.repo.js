import { query, queryOne, updateTgTimestamp } from '../../utils/db.js';

// ── Scalar fields on TG_TechQuestionaire ─────────────────────────────────────
const TQ_ALLOWED_FIELDS = [
  'IsStandardBreedingScheme',
  'TqHybridVariety',
  'BreedingSchemeInfo',
  'IsProdSchemeForHybrid',
  'ProdSchemeInfo',
  'DiffCharacteristic',
  'SimilarVarietyExpression',
  'CandidateVarietyExpression',
  'IsTqColorImage',
  'ColorImageTitle',
  'ColorImageInfo',
  'ProvideVirusPresence',
  'VirusPresenceInfo',
  'TqAddSentence',
  'BreedingSchemeDisplayedFlag',
  'TqHybridVarietyFlag',
  'ExaminationAddInfo',
];

const SUBJECT_ALLOWED = ['TqBotanicalName', 'TqCommonName', 'TqAdditionalInfo', 'UpovCode_ID', 'insert_order', 'TqAddSentence'];
const BS_ALLOWED = ['TqBreedingSchemeMethodID', 'TqBreedingSChemeOtherDetails'];
const PM_ALLOWED = ['TqVarietyPropagationMethodID', 'TqPMethodOtherDetails'];

/**
 * Helper: get TechQu_ID for a TG_ID
 */
const getTechQuId = async (tgId) => {
  const row = await queryOne('SELECT TechQu_ID FROM TG_TechQuestionaire WHERE TG_ID = ?', [tgId]);
  return row?.TechQu_ID;
};

// ── Scalar update ────────────────────────────────────────────────────────────

export const updateTq = async (tgId, data) => {
  const fields = Object.keys(data).filter((f) => TQ_ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f]);

  const result = await query(
    `UPDATE TG_TechQuestionaire SET ${setClauses} WHERE TG_ID = ?`,
    [...values, tgId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    await updateTgTimestamp(tgId);
  }
  
  return result.affectedRows > 0;
};

// ── Subjects ─────────────────────────────────────────────────────────────────

export const createSubject = async (tgId, data) => {
  const techQuId = await getTechQuId(tgId);
  if (!techQuId) return null;

  const maxRow = await queryOne(
    'SELECT COALESCE(MAX(insert_order), 0) + 1 as nextOrder FROM TqSubject WHERE TechQu_ID = ?',
    [techQuId]
  );

  const fields = Object.keys(data).filter((f) => SUBJECT_ALLOWED.includes(f));
  const columns = ['TechQu_ID', 'insert_order', ...fields];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [techQuId, data.insert_order || maxRow?.nextOrder || 1, ...fields.map((f) => data[f])];

  const result = await query(
    `INSERT INTO TqSubject (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  const subject = await queryOne(
    'SELECT TqSubjectID, TqBotanicalName, TqCommonName, insert_order FROM TqSubject WHERE TqSubjectID = ?',
    [result.insertId]
  );
  
  // Update timestamp on successful create
  await updateTgTimestamp(tgId);
  
  return subject;
};

export const updateSubject = async (subjectId, data) => {
  const fields = Object.keys(data).filter((f) => SUBJECT_ALLOWED.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f]);

  const result = await query(
    `UPDATE TqSubject SET ${setClauses} WHERE TqSubjectID = ?`,
    [...values, subjectId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    const subject = await queryOne(
      `SELECT tq.TG_ID FROM TqSubject s
       JOIN TG_TechQuestionaire tq ON s.TechQu_ID = tq.TechQu_ID
       WHERE s.TqSubjectID = ?`,
      [subjectId]
    );
    if (subject?.TG_ID) {
      await updateTgTimestamp(subject.TG_ID);
    }
  }
  
  return result.affectedRows > 0;
};

export const deleteSubject = async (subjectId) => {
  // Get tgId before deleting
  const subject = await queryOne(
    `SELECT tq.TG_ID FROM TqSubject s
     JOIN TG_TechQuestionaire tq ON s.TechQu_ID = tq.TechQu_ID
     WHERE s.TqSubjectID = ?`,
    [subjectId]
  );
  
  const result = await query('DELETE FROM TqSubject WHERE TqSubjectID = ?', [subjectId]);
  
  // Update timestamp on successful delete
  if (result.affectedRows > 0 && subject?.TG_ID) {
    await updateTgTimestamp(subject.TG_ID);
  }
  
  return result.affectedRows > 0;
};

// ── Breeding Schemes ─────────────────────────────────────────────────────────

export const createBreedingScheme = async (tgId, data) => {
  const techQuId = await getTechQuId(tgId);
  if (!techQuId) return null;

  const fields = Object.keys(data).filter((f) => BS_ALLOWED.includes(f));
  const columns = ['TechQu_ID', ...fields];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [techQuId, ...fields.map((f) => data[f])];

  const result = await query(
    `INSERT INTO TqBreedingScheme (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  const breedingScheme = await queryOne(
    'SELECT TqBreedingSchemeID, TqBreedingSchemeMethodID, TqBreedingSChemeOtherDetails FROM TqBreedingScheme WHERE TqBreedingSchemeID = ?',
    [result.insertId]
  );
  
  // Update timestamp on successful create
  await updateTgTimestamp(tgId);
  
  return breedingScheme;
};

export const updateBreedingScheme = async (bsId, data) => {
  const fields = Object.keys(data).filter((f) => BS_ALLOWED.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f]);

  const result = await query(
    `UPDATE TqBreedingScheme SET ${setClauses} WHERE TqBreedingSchemeID = ?`,
    [...values, bsId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    const bs = await queryOne(
      `SELECT tq.TG_ID FROM TqBreedingScheme bs
       JOIN TG_TechQuestionaire tq ON bs.TechQu_ID = tq.TechQu_ID
       WHERE bs.TqBreedingSchemeID = ?`,
      [bsId]
    );
    if (bs?.TG_ID) {
      await updateTgTimestamp(bs.TG_ID);
    }
  }
  
  return result.affectedRows > 0;
};

export const deleteBreedingScheme = async (bsId) => {
  // Get tgId before deleting
  const bs = await queryOne(
    `SELECT tq.TG_ID FROM TqBreedingScheme bs
     JOIN TG_TechQuestionaire tq ON bs.TechQu_ID = tq.TechQu_ID
     WHERE bs.TqBreedingSchemeID = ?`,
    [bsId]
  );
  
  const result = await query('DELETE FROM TqBreedingScheme WHERE TqBreedingSchemeID = ?', [bsId]);
  
  // Update timestamp on successful delete
  if (result.affectedRows > 0 && bs?.TG_ID) {
    await updateTgTimestamp(bs.TG_ID);
  }
  
  return result.affectedRows > 0;
};

// ── Propagation Methods ──────────────────────────────────────────────────────

export const createTqPropMethod = async (tgId, data) => {
  const techQuId = await getTechQuId(tgId);
  if (!techQuId) return null;

  const fields = Object.keys(data).filter((f) => PM_ALLOWED.includes(f));
  const columns = ['TechQu_ID', ...fields];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [techQuId, ...fields.map((f) => data[f])];

  const result = await query(
    `INSERT INTO TqPropagationMethod (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  const propMethod = await queryOne(
    'SELECT TqPropagationMethodID, TqVarietyPropagationMethodID, TqPMethodOtherDetails FROM TqPropagationMethod WHERE TqPropagationMethodID = ?',
    [result.insertId]
  );
  
  // Update timestamp on successful create
  await updateTgTimestamp(tgId);
  
  return propMethod;
};

export const updateTqPropMethod = async (pmId, data) => {
  const fields = Object.keys(data).filter((f) => PM_ALLOWED.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f]);

  const result = await query(
    `UPDATE TqPropagationMethod SET ${setClauses} WHERE TqPropagationMethodID = ?`,
    [...values, pmId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    const pm = await queryOne(
      `SELECT tq.TG_ID FROM TqPropagationMethod pm
       JOIN TG_TechQuestionaire tq ON pm.TechQu_ID = tq.TechQu_ID
       WHERE pm.TqPropagationMethodID = ?`,
      [pmId]
    );
    if (pm?.TG_ID) {
      await updateTgTimestamp(pm.TG_ID);
    }
  }
  
  return result.affectedRows > 0;
};

export const deleteTqPropMethod = async (pmId) => {
  // Get tgId before deleting
  const pm = await queryOne(
    `SELECT tq.TG_ID FROM TqPropagationMethod pm
     JOIN TG_TechQuestionaire tq ON pm.TechQu_ID = tq.TechQu_ID
     WHERE pm.TqPropagationMethodID = ?`,
    [pmId]
  );
  
  const result = await query('DELETE FROM TqPropagationMethod WHERE TqPropagationMethodID = ?', [pmId]);
  
  // Update timestamp on successful delete
  if (result.affectedRows > 0 && pm?.TG_ID) {
    await updateTgTimestamp(pm.TG_ID);
  }
  
  return result.affectedRows > 0;
};

// ── TQ Characteristics ───────────────────────────────────────────────────────

export const createTqChar = async (tgId, data) => {
  const techQuId = await getTechQuId(tgId);
  if (!techQuId) return null;

  const maxRow = await queryOne(
    'SELECT COALESCE(MAX(SequenceNumber), 0) + 1 as nextSeq FROM TQ_Characteristics WHERE TechQu_ID = ?',
    [techQuId]
  );

  const result = await query(
    `INSERT INTO TQ_Characteristics (TechQu_ID, TOC_ID, Name, SequenceNumber) VALUES (?, ?, ?, ?)`,
    [techQuId, data.TOC_ID || null, data.Name || '', data.SequenceNumber || maxRow?.nextSeq || 1]
  );

  const characteristic = await queryOne(
    'SELECT TQ_CharacteristicsID, TOC_ID, Name, SequenceNumber FROM TQ_Characteristics WHERE TQ_CharacteristicsID = ?',
    [result.insertId]
  );
  
  // Update timestamp on successful create
  await updateTgTimestamp(tgId);
  
  return characteristic;
};

export const deleteTqChar = async (charId) => {
  // Get tgId before deleting
  const char = await queryOne(
    `SELECT tq.TG_ID FROM TQ_Characteristics c
     JOIN TG_TechQuestionaire tq ON c.TechQu_ID = tq.TechQu_ID
     WHERE c.TQ_CharacteristicsID = ?`,
    [charId]
  );
  
  await query('DELETE FROM TQ_ExpressionNotes WHERE TQ_CharacteristicsID = ?', [charId]);
  const result = await query('DELETE FROM TQ_Characteristics WHERE TQ_CharacteristicsID = ?', [charId]);
  
  // Update timestamp on successful delete
  if (result.affectedRows > 0 && char?.TG_ID) {
    await updateTgTimestamp(char.TG_ID);
  }
  
  return result.affectedRows > 0;
};

// ── Lookups ──────────────────────────────────────────────────────────────────

export const findBreedingSchemeMethods = async () => {
  return query(
    `SELECT TqBreedingSchemeMethodID as code, TqBreedingSchemeMethodMethodDesc as label
    FROM TQBreedingSchemeMethod
    WHERE IsActive = 'A'
    ORDER BY SeqId`
  );
};

export const findPropagationMethodTypes = async () => {
  return query(
    `SELECT TqVarietyPropagationMethodID as code, TqVarietyPropagationMethodDesc as label
    FROM TqVarietyPropagationMethod
    WHERE IsActive = 'A'
    ORDER BY SeqId`
  );
};

export { TQ_ALLOWED_FIELDS };
