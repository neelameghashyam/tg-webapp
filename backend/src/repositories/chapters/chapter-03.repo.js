import { query, queryOne, updateTgTimestamp } from '../../utils/db.js';

/**
 * Fields the PATCH endpoint accepts for TG_Examination.
 *
 * ⚠️  Columns marked ADDED below exist in ALLOWED_FIELDS so the frontend can
 *     send them, but they may not yet exist in the live DB (pending migration).
 *     They are EXCLUDED from INSERT_REQUIRED_FIELDS intentionally — they will
 *     only be written when present in the request AND they exist in the DB.
 *     Add them to INSERT_REQUIRED_FIELDS once the migration has been applied.
 */
const ALLOWED_FIELDS = [
  'GrowingCycle',
  'PlantingForm',
  'IsFruitCrop',
  'CropType',
  'CropTypeOtherInfo',
  'FruitDormantPeriod',
  'GrowingCycleAddInfo',
  'OtherGrowingCycleInfo',
  'ExaminationMethodAddInfo', // ⚠️ ADDED — exclude from INSERT until migration runs
  'PlantType',
  'PlantTypeRep',             // ⚠️ ADDED — exclude from INSERT until migration runs
  'PlantNumber',
  'Devlopmentstage',
  'DifferentPlotsForObservation',
  'PlotTypeA',
  'PlotTypeB',
  'PlotTypeC',
  'PlotTypeD',
  'EyeColorObservation',
  'ConditionAddInfo',
  'IsOneMethodOfPropogation',
  'PropagationMethodName',    // ⚠️ ADDED — exclude from INSERT until migration runs
  'PlotDesign',
  'PlantRemoval',
  'TestDesignAddInfo',
  'PlantNumberA',
  'PlantNumberB',
  'PlantNumberC',
  'PlantNumberD',
  'RowPlotSizeA',
  'RowPlotSizeB',
  'RowPlotSizeC',
  'RowPlotSizeD',
  'PlantTypeA',
  'PlantTypeB',
  'PlantTypeC',
  'PlantTypeD',
  'OtherPlantType',
  'OtherPlantTypeA',
  'OtherPlantTypeB',
  'OtherPlantTypeC',
  'OtherPlantTypeD',
  'Replicatenum',
  'testDesignPlotTypeA',
  'testDesignPlotTypeB',
  'testDesignPlotTypeC',
  'testDesignPlotTypeD',
];

/**
 * Columns confirmed to exist in TG_Examination that must be present in every
 * INSERT. Any field not in the request defaults to '' so NOT NULL columns with
 * no DB default (e.g. GrowingCycle) never cause ER_NO_DEFAULT_FOR_FIELD.
 *
 * ⚠️ ADDED columns (ExaminationMethodAddInfo, PlantTypeRep, PropagationMethodName)
 * are intentionally omitted here to avoid ER_BAD_FIELD_ERROR until the ALTER
 * TABLE migration has been applied to the live DB.
 * Once migrated, move them from ALLOWED_FIELDS into this list.
 */
const INSERT_REQUIRED_FIELDS = [
  'GrowingCycle',
  'PlantingForm',
  'IsFruitCrop',
  'CropType',
  'CropTypeOtherInfo',
  'FruitDormantPeriod',
  'GrowingCycleAddInfo',
  'OtherGrowingCycleInfo',
  'PlantType',
  'PlantNumber',
  'Devlopmentstage',
  'DifferentPlotsForObservation',
  'PlotTypeA',
  'PlotTypeB',
  'PlotTypeC',
  'PlotTypeD',
  'EyeColorObservation',
  'ConditionAddInfo',
  'IsOneMethodOfPropogation',
  'PlotDesign',
  'PlantRemoval',
  'TestDesignAddInfo',
  'PlantNumberA',
  'PlantNumberB',
  'PlantNumberC',
  'PlantNumberD',
  'RowPlotSizeA',
  'RowPlotSizeB',
  'RowPlotSizeC',
  'RowPlotSizeD',
  'PlantTypeA',
  'PlantTypeB',
  'PlantTypeC',
  'PlantTypeD',
  'OtherPlantType',
  'OtherPlantTypeA',
  'OtherPlantTypeB',
  'OtherPlantTypeC',
  'OtherPlantTypeD',
  'Replicatenum',
  'testDesignPlotTypeA',
  'testDesignPlotTypeB',
  'testDesignPlotTypeC',
  'testDesignPlotTypeD',
];

/**
 * PATCH /api/test-guidelines/:id/chapters/03
 *
 * Upsert TG_Examination:
 *  - Row exists  → UPDATE only the fields present in the request body.
 *  - No row yet  → INSERT using INSERT_REQUIRED_FIELDS (confirmed-existing DB
 *                  columns) with '' as fallback for absent fields so NOT NULL
 *                  constraints are always satisfied.
 *                  ⚠️ ADDED columns are excluded from INSERT until migrated.
 */
export const updateChapter03 = async (tgId, updates) => {
  const fields = Object.keys(updates).filter((f) => ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const existing = await queryOne(
    'SELECT Examination_ID FROM TG_Examination WHERE TG_ID = ? LIMIT 1',
    [tgId]
  );

  let result;

  if (existing) {
    // Row exists — UPDATE only what was sent in the request.
    const setClauses = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => updates[f]);
    result = await query(
      `UPDATE TG_Examination SET ${setClauses} WHERE TG_ID = ? LIMIT 1`,
      [...values, tgId]
    );
  } else {
    // No row yet — INSERT all confirmed-existing columns with '' fallback.
    // Only INSERT_REQUIRED_FIELDS are used — ⚠️ ADDED columns are skipped
    // until the DB migration adds them.
    const columns = ['TG_ID', ...INSERT_REQUIRED_FIELDS];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [tgId, ...INSERT_REQUIRED_FIELDS.map((f) => updates[f] ?? '')];
    result = await query(
      `INSERT INTO TG_Examination (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }

  const success = (result.affectedRows ?? 0) > 0 || (result.insertId ?? 0) > 0;
  if (success) await updateTgTimestamp(tgId);
  return success;
};

// ── Propagation Methods CRUD ───────────────────────────────────────────────

const getExaminationId = async (tgId) => {
  const row = await queryOne(
    'SELECT Examination_ID FROM TG_Examination WHERE TG_ID = ?',
    [tgId]
  );
  return row?.Examination_ID;
};

export const findPropMethods = async (tgId) => {
  return query(
    `SELECT epm.*
     FROM ExaminationPropagationMethod epm
     JOIN TG_Examination ex ON epm.Examination_ID = ex.Examination_ID
     WHERE ex.TG_ID = ?
     ORDER BY epm.ExaminationPropagationMethod_ID`,
    [tgId]
  );
};

export const createPropMethod = async (tgId, data) => {
  const examinationId = await getExaminationId(tgId);
  if (!examinationId) return null;

  const propFields = [
    'PropogationMethod',
    'OtherPropogationMethodInfo',
    'PlotDesign',
    'PlantNumber',
    'PlantType',
    'OtherPlantType',
    'Replicatenum',
    'PlantNumberA',
    'PlantTypeA',
    'OtherPlantTypeA',
    'RowPlotSizeA',
    'PlantNumberB',
    'PlantTypeB',
    'OtherPlantTypeB',
    'RowPlotSizeB',
    'PlantNumberC',
    'PlantTypeC',
    'OtherPlantTypeC',
    'RowPlotSizeC',
    'PlantNumberD',
    'PlantTypeD',
    'OtherPlantTypeD',
    'RowPlotSizeD',
    'TestDesignPlotTypeA',
    'TestDesignPlotTypeB',
    'TestDesignPlotTypeC',
    'TestDesignPlotTypeD',
  ];

  const columns = ['Examination_ID'];
  const values = [examinationId];

  propFields.forEach((field) => {
    if (data[field] !== undefined) {
      columns.push(field);
      values.push(data[field]);
    }
  });

  const placeholders = columns.map(() => '?').join(', ');
  const result = await query(
    `INSERT INTO ExaminationPropagationMethod (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  await updateTgTimestamp(tgId);

  return queryOne(
    'SELECT * FROM ExaminationPropagationMethod WHERE ExaminationPropagationMethod_ID = ?',
    [result.insertId]
  );
};

export const updatePropMethod = async (pmId, data) => {
  const allowedFields = [
    'PropogationMethod',
    'OtherPropogationMethodInfo',
    'PlotDesign',
    'PlantNumber',
    'PlantType',
    'OtherPlantType',
    'Replicatenum',
    'PlantNumberA',
    'PlantTypeA',
    'OtherPlantTypeA',
    'RowPlotSizeA',
    'PlantNumberB',
    'PlantTypeB',
    'OtherPlantTypeB',
    'RowPlotSizeB',
    'PlantNumberC',
    'PlantTypeC',
    'OtherPlantTypeC',
    'RowPlotSizeC',
    'PlantNumberD',
    'PlantTypeD',
    'OtherPlantTypeD',
    'RowPlotSizeD',
    'TestDesignPlotTypeA',
    'TestDesignPlotTypeB',
    'TestDesignPlotTypeC',
    'TestDesignPlotTypeD',
  ];

  const fields = Object.keys(data).filter((f) => allowedFields.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f]);

  const result = await query(
    `UPDATE ExaminationPropagationMethod SET ${setClauses} WHERE ExaminationPropagationMethod_ID = ?`,
    [...values, pmId]
  );

  if (result.affectedRows > 0) {
    const pm = await queryOne(
      `SELECT ex.TG_ID
       FROM ExaminationPropagationMethod epm
       JOIN TG_Examination ex ON epm.Examination_ID = ex.Examination_ID
       WHERE epm.ExaminationPropagationMethod_ID = ?`,
      [pmId]
    );
    if (pm?.TG_ID) await updateTgTimestamp(pm.TG_ID);
  }

  return result.affectedRows > 0;
};

export const deletePropMethod = async (pmId) => {
  const pm = await queryOne(
    `SELECT ex.TG_ID
     FROM ExaminationPropagationMethod epm
     JOIN TG_Examination ex ON epm.Examination_ID = ex.Examination_ID
     WHERE epm.ExaminationPropagationMethod_ID = ?`,
    [pmId]
  );

  const result = await query(
    'DELETE FROM ExaminationPropagationMethod WHERE ExaminationPropagationMethod_ID = ?',
    [pmId]
  );

  if (result.affectedRows > 0 && pm?.TG_ID) await updateTgTimestamp(pm.TG_ID);

  return result.affectedRows > 0;
};

export { ALLOWED_FIELDS };