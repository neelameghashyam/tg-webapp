import { query, queryOne } from '../../utils/db.js';

/**
 * Load TG header + extended flags
 */
export const findTgHeader = async (tgId) => {
  return queryOne(
    `SELECT
      tg.TG_ID,
      tg.TG_Reference,
      tg.TG_Name,
      tg.Status_Code,
      tg.Language_Code,
      tg.LE_Draft_StartDate,
      tg.LE_Draft_EndDate,
      tg.IE_Comments_StartDate,
      tg.IE_Comments_EndDate,
      tg.LE_Checking_StartDate,
      tg.LE_Checking_EndDate,
      tg.AdminComments,
      tg.TG_lastupdated,
      tg.Name_AssoDocInfo,
      tg.GroupingSummaryText,
      tg.CharacteristicLegend,
      tg.ExampleVarietyText,
      tg.isExampleVarietyText,
      tg.isCharacteristicsLegend,
      COALESCE(ext.isMushroom, 'N') as isMushroom
    FROM TG tg
    LEFT JOIN TG_Extended ext ON ext.TG_ID = tg.TG_ID
    WHERE tg.TG_ID = ? AND tg.Status_Code != 'DEL'`,
    [tgId]
  );
};

/**
 * Load UPOV codes for a TG
 */
export const findUpovCodes = async (tgId) => {
  return query(
    `SELECT
      uc.UpovCode_ID as Upov_Code_ID,
      uc.Upov_Code as code,
      uc.Principal_Botanical_Name as botanicalName,
      tuc.seqNumber
    FROM TG_UPOVCode tuc
    JOIN Upov_Code uc ON tuc.UpovCode_ID = uc.UpovCode_ID
    WHERE tuc.TG_ID = ?
    ORDER BY tuc.seqNumber`,
    [tgId]
  );
};

/**
 * Chapter 01 — Subject
 */
export const findChapter01 = async (tgId) => {
  return queryOne(
    `SELECT
      Sub_Add_Id,
      Sub_Add_Info,
      Sub_check,
      Sub_DD_Value,
      Sub_OtherInfo,
      Variety_Type,
      SubjectClarificationIndicator,
      SubjectSpeciesCategory
    FROM TG_Sub_Add_Info
    WHERE TG_ID = ?
    LIMIT 1`,
    [tgId]
  );
};

/**
 * Chapter 02 — Material Required
 */
export const findChapter02 = async (tgId) => {
  return queryOne(
    `SELECT
      Material_ID,
      Material_Supplied,
      Min_Plant_Material,
      SeedQualityReq,
      Material_AddInfo
    FROM TG_Material
    WHERE TG_ID = ?
    LIMIT 1`,
    [tgId]
  );
};

/**
 * Chapter 03 — Method of Examination
 */
export const findChapter03 = async (tgId) => {
  return queryOne(
    `SELECT *
    FROM TG_Examination
    WHERE TG_ID = ?
    LIMIT 1`,
    [tgId]
  );
};

/**
 * Chapter 04 — Assessment of DUS
 */
export const findChapter04 = async (tgId) => {
  return queryOne(
    `SELECT *
    FROM TG_Assessment
    WHERE TG_ID = ?
    LIMIT 1`,
    [tgId]
  );
};

/**
 * Chapter 06 — Additional Characteristics intro
 */
export const findChapter06 = async (tgId) => {
  return queryOne(
    `SELECT
      additionalChar_ID,
      additionalCharacteriticsReferences
    FROM TG_AdditionalCharacteristics
    WHERE TG_ID = ?
    LIMIT 1`,
    [tgId]
  );
};

/**
 * Chapter 07 — Characteristics with expressions
 */
export const findCharacteristics = async (tgId) => {
  const chars = await query(
    `SELECT
      TOC_ID,
      CharacteristicOrder,
      TOC_Name,
      Expression_Type,
      ObservationM_PlotT,
      GROWTH_STAGES,
      Asterisk,
      Grouping,
      Add_To_TQ5,
      Grouping_Text,
      IsAdoptedTG,
      IsAdoptedTGModify
    FROM TG_Characteristics
    WHERE TG_ID = ?
    ORDER BY CharacteristicOrder`,
    [tgId]
  );

  if (chars.length === 0) return [];

  const tocIds = chars.map((c) => c.TOC_ID);
  const placeholders = tocIds.map(() => '?').join(',');
  const expressions = await query(
    `SELECT
      Expression_Notes_ID as TOC_Expression_Notes_ID,
      TOC_ID,
      State_of_Expression,
      Expression_Notes,
      Example_Varieties,
      Expression_Notes_Row_Index
    FROM TOC_Expression_Notes
    WHERE TOC_ID IN (${placeholders})
    ORDER BY Expression_Notes_Row_Index`,
    tocIds
  );

  // Group expressions by TOC_ID
  const exprMap = {};
  for (const expr of expressions) {
    if (!exprMap[expr.TOC_ID]) exprMap[expr.TOC_ID] = [];
    exprMap[expr.TOC_ID].push(expr);
  }

  return chars.map((c) => ({
    ...c,
    expressions: exprMap[c.TOC_ID] || [],
  }));
};

/**
 * Chapter 08 — Explanations
 */
export const findExplanations = async (tgId) => {
  return query(
    `SELECT
      ce.Char_Explanation_ID as Explanation_ID,
      ce.TOC_ID,
      ce.Explaination_Text
    FROM TOC_Characteristic_Explanation ce
    JOIN TG_Characteristics tc ON ce.TOC_ID = tc.TOC_ID
    WHERE tc.TG_ID = ?
    ORDER BY tc.CharacteristicOrder`,
    [tgId]
  );
};

/**
 * Chapter 09 — Literature
 */
export const findChapter09 = async (tgId) => {
  return queryOne(
    `SELECT
      Literature_ID,
      LiteratureReferences
    FROM TG_Literature
    WHERE TG_ID = ?
    LIMIT 1`,
    [tgId]
  );
};

/**
 * Chapter 10 — Technical Questionnaire (scalar fields)
 */
export const findChapter10 = async (tgId) => {
  return queryOne(
    `SELECT *
    FROM TG_TechQuestionaire
    WHERE TG_ID = ?
    LIMIT 1`,
    [tgId]
  );
};

export const findTqSubjects = async (techQuId) => {
  return query(
    `SELECT TqSubjectID, TqBotanicalName, TqCommonName, insert_order
    FROM TqSubject
    WHERE TechQu_ID = ?
    ORDER BY insert_order`,
    [techQuId]
  );
};

export const findTqBreedingSchemes = async (techQuId) => {
  return query(
    `SELECT TqBreedingSchemeID, TqBreedingSchemeMethodID, TqBreedingSChemeOtherDetails
    FROM TqBreedingScheme
    WHERE TechQu_ID = ?`,
    [techQuId]
  );
};

export const findTqPropagationMethods = async (techQuId) => {
  return query(
    `SELECT TqPropagationMethodID, TqVarietyPropagationMethodID, TqPMethodOtherDetails
    FROM TqPropagationMethod
    WHERE TechQu_ID = ?`,
    [techQuId]
  );
};

export const findTqCharacteristics = async (techQuId) => {
  return query(
    `SELECT TQ_CharacteristicsID, TOC_ID, Name, SequenceNumber
    FROM TQ_Characteristics
    WHERE TechQu_ID = ?
    ORDER BY SequenceNumber`,
    [techQuId]
  );
};

/**
 * Chapter 11 — Annex
 */
export const findChapter11 = async (tgId) => {
  return queryOne(
    `SELECT
      Annex_ID,
      annexRefData
    FROM TG_Annex
    WHERE TG_ID = ?
    LIMIT 1`,
    [tgId]
  );
};

/**
 * Shared paragraphs — TG_Sub_Add_Info rows that are chapter-flagged
 * Note: The main ch01 row also lives in this table. Paragraphs are additional rows
 * with the same TG_ID. We distinguish them by Sub_Add_Id != the ch01 row.
 */
export const findParagraphs = async (tgId) => {
  // Return only extra paragraph rows — exclude the main ch01 row (smallest Sub_Add_Id)
  return query(
    `SELECT Sub_Add_Id, Sub_Add_Info, TG_ID
    FROM TG_Sub_Add_Info
    WHERE TG_ID = ? AND Sub_Add_Id > (
      SELECT MIN(Sub_Add_Id) FROM TG_Sub_Add_Info WHERE TG_ID = ?
    )
    ORDER BY Sub_Add_Id`,
    [tgId, tgId]
  );
};

/**
 * Propagation methods — Examination (shared by ch02/03)
 */
export const findExamPropMethods = async (tgId) => {
  return query(
    `SELECT epm.*
    FROM ExaminationPropagationMethod epm
    JOIN TG_Examination ex ON epm.Examination_ID = ex.Examination_ID
    WHERE ex.TG_ID = ?`,
    [tgId]
  );
};

/**
 * Propagation methods — Assessment (ch04)
 */
export const findAssessmentPropMethods = async (tgId) => {
  return query(
    `SELECT amp.*
    FROM AssesmentMethodPropogation amp
    JOIN TG_Assessment a ON amp.Assessment_ID = a.Assessment_Id
    WHERE a.TG_ID = ?`,
    [tgId]
  );
};

/**
 * Lookups — expression types
 */
export const findExpressionTypes = async () => {
  return query(
    `SELECT Expression_Type as code, Expression_Desc as label
    FROM TOC_Expression_Type
    ORDER BY Expression_Type`
  );
};

/**
 * Lookups — observation methods
 */
export const findObservationMethods = async () => {
  return query(
    `SELECT Observation_Method as code, Observation_Method as label
    FROM TOC_Observation_Method
    ORDER BY Observation_Method_ID`
  );
};

/**
 * Lookups — breeding scheme methods
 */
export const findBreedingSchemeMethods = async () => {
  return query(
    `SELECT TqBreedingSchemeMethodID as code, TqBreedingSchemeMethodMethodDesc as label
    FROM TQBreedingSchemeMethod
    WHERE IsActive = 'A'
    ORDER BY SeqId`
  );
};

/**
 * Lookups — propagation method types
 */
export const findPropagationMethodTypes = async () => {
  return query(
    `SELECT TqVarietyPropagationMethodID as code, TqVarietyPropagationMethodDesc as label
    FROM TqVarietyPropagationMethod
    WHERE IsActive = 'A'
    ORDER BY SeqId`
  );
};
