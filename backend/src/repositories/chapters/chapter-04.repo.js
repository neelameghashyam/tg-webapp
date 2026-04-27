import { query, queryOne, updateTgTimestamp } from '../../utils/db.js';

const ALLOWED_FIELDS = [
  // Distinctness (4.1)
  'IsHybridParentFormula',
  'IsHybridVariety',
  'IsHybridVarietyGuideline',
  'SinglePlant',
  'PartsPlant',
  'IsPartsOfSinglePlants',
  'IsOneMethodOfPropogation',
  'DistinctnessAddInfo',
  'DistinctnessHybridAddInfo',
  
  // Uniformity (4.2)
  'typeOfPropagation',
  'OtherTypeOfPropagation',
  'CrossPolinattedVarieties',
  'UniformityCrossPollinatedAddInfo',
  'UniformityHybridAddInfo',
  'UniformityParentFormulaAddInfo',
  'UniformityAssessmentSameSample',
  'UniformityAssessmentDifferentSample',
  // Note: UniformityAssessmentDifferentSampleAllPlants and UniformityAssessmentSubSample
  // are stored as part of UniformityAssessmentDifferentSample (semicolon-delimited)
  
  // Uniformity - Off-type same sample (Question 4)
  'UniformityPropogationType',
  'OtherUniformityPropogationType',
  'PopulationStandard',
  'AcceptanceProbability',
  'PlantSampleSize',
  'OffType',
  'UniformityOfftypeSameSampleAddInfo',
  'UniformityOfftypeSameSampleAddSentence',
  
  // Uniformity - Different sample all plants (Question 5a)
  'DiffUniformityPlantSample',
  'DiffPopulationStandard',
  'DiffAcceptanceProbability',
  'DiffPlantSampleSize',
  'DiffOffType',
  'UniformityOfftypeAllPlantsAddInfo',
  'UniformityOfftypeAllPlantsAddSentence',
  
  // Uniformity - Different sample subsample (Question 5b)
  'SubSampleTypeA',
  'SubSampleTypeB',
  'SubSampleTypeC',
  'OtherSubSampleTypeA',
  'OtherSubSampleTypeB',
  'OtherSubSampleTypeC',
  'RowsSubSampleTypeA',
  'RowsSubSampleTypeB',
  'RowsSubSampleTypeC',
  'OtherRowsSubSampleTypeA',
  'OtherRowsSubSampleTypeB',
  'OtherRowsSubSampleTypeC',
  'SubSamplePopulationStandard',
  'SubSampleAcceptanceProbability',
  'SubSampleSize',
  'SubSampleOffType',
  'UniformityOfftypeSubsampleAddInfo',
  'UniformityOfftypeSubsampleAddSentence',
  
  // Uniformity - General
  'UniformityAddInfo',
  'TypesOfVariety',
  'OtherVarietyTypes',
  
  // Stability (4.3)
  'TGCovering',
  'IsParentLineAssessed',
  'StabilityAddInfo',
];

export const updateChapter04 = async (tgId, updates) => {
  const fields = Object.keys(updates).filter((f) => ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);

  // 1️⃣ TRY UPDATE
  const result = await query(
    `UPDATE TG_Assessment SET ${setClauses} WHERE TG_ID = ?`,
    [...values, tgId]
  );

  if (result.affectedRows > 0) {
    await updateTgTimestamp(tgId);
    return true;
  }

  // 2️⃣ INSERT IF NOT EXISTS ✅
  const insertFields = ['TG_ID', ...fields];
  const insertValues = [tgId, ...values];
  const placeholders = insertFields.map(() => '?').join(', ');

  await query(
    `INSERT INTO TG_Assessment (${insertFields.join(', ')})
     VALUES (${placeholders})`,
    insertValues
  );

  await updateTgTimestamp(tgId);

  return true;
};

export const findAssessmentId = async (tgId) => {
  const row = await queryOne(
    `SELECT Assessment_Id FROM TG_Assessment WHERE TG_ID = ? LIMIT 1`,
    [tgId]
  );
  return row?.Assessment_Id ?? null;
};

// Real DB columns in AssesmentMethodPropogation (verified from SELECT * response):
//   AssesmentMethodPropogation_ID, Assessment_ID,
//   PropogationMethod, OtherPropogationMethodInfo,
//   NumberOfPlants  (stored as "first;second"),
//   NumberOfPartsOfPlants, isPartsOfSinglePlants
const PROP_METHOD_FIELDS = [
  'PropogationMethod',
  'OtherPropogationMethodInfo',
  'NumberOfPlants',
  'NumberOfPartsOfPlants',
  'isPartsOfSinglePlants',
];

export const createAssessmentPropMethod = async (tgId, data) => {
  const assessmentId = await findAssessmentId(tgId);
  if (!assessmentId) return null;
  const result = await query(
    `INSERT INTO AssesmentMethodPropogation
       (Assessment_ID, PropogationMethod, OtherPropogationMethodInfo,
        NumberOfPlants, NumberOfPartsOfPlants, isPartsOfSinglePlants)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      assessmentId,
      data.PropogationMethod ?? '',
      data.OtherPropogationMethodInfo ?? '',
      data.NumberOfPlants ?? ';',
      data.NumberOfPartsOfPlants ?? '',
      data.isPartsOfSinglePlants ?? 'N',
    ]
  );
  // Update timestamp on successful create
  await updateTgTimestamp(tgId);
  
  return queryOne(
    `SELECT * FROM AssesmentMethodPropogation WHERE AssesmentMethodPropogation_ID = ?`,
    [result.insertId]
  );
};

export const updateAssessmentPropMethod = async (tgId, pmId, updates) => {
  const fields = Object.keys(updates).filter((f) => PROP_METHOD_FIELDS.includes(f));
  if (fields.length === 0) return false;
  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);
  const result = await query(
    `UPDATE AssesmentMethodPropogation amp
     JOIN TG_Assessment a ON amp.Assessment_ID = a.Assessment_Id
     SET ${setClauses}
     WHERE amp.AssesmentMethodPropogation_ID = ? AND a.TG_ID = ?`,
    [...values, pmId, tgId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    await updateTgTimestamp(tgId);
  }
  
  return result.affectedRows > 0;
};

export const deleteAssessmentPropMethod = async (tgId, pmId) => {
  const result = await query(
    `DELETE amp FROM AssesmentMethodPropogation amp
     JOIN TG_Assessment a ON amp.Assessment_ID = a.Assessment_Id
     WHERE amp.AssesmentMethodPropogation_ID = ? AND a.TG_ID = ?`,
    [pmId, tgId]
  );
  
  // Update timestamp on successful delete
  if (result.affectedRows > 0) {
    await updateTgTimestamp(tgId);
  }
  
  return result.affectedRows > 0;
};

export { ALLOWED_FIELDS };