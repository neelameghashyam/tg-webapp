import { query, execute } from '../utils/db.js';

export const findTGsWithDateToday = async () => {
  return query(`
    SELECT TG_Reference, Status_Code
    FROM TG
    WHERE (
      LE_Draft_StartDate = CURRENT_DATE OR
      IE_Comments_StartDate = CURRENT_DATE OR
      LE_Checking_StartDate = CURRENT_DATE OR
      DATE(LE_Checking_EndDate) + INTERVAL 1 DAY = CURRENT_DATE OR
      LE_Draft_EndDate = CURRENT_DATE OR
      LE_Checking_EndDate = CURRENT_DATE OR
      ECC_StartDate = CURRENT_DATE OR
      DATE(ECC_EndDate) + INTERVAL 1 DAY = CURRENT_DATE
    ) AND Status_Code != 'DEL'
  `);
};

// ── TWP pipeline ─────────────────────────────────────────────────────────────

export const updateToLEDraft = async () => {
  return execute(`
    UPDATE TG
    SET TG_LastUpdated = CURRENT_TIMESTAMP, Status_Code = 'LED'
    WHERE LE_Draft_StartDate = CURRENT_DATE
      AND Status_Code = 'CRT'
      AND IsTGStatusOverride = 'N'
  `);
};

export const updateToIEComments = async () => {
  return execute(`
    UPDATE TG
    SET TG_LastUpdated = CURRENT_TIMESTAMP, Status_Code = 'IEC'
    WHERE IE_Comments_StartDate = CURRENT_DATE
      AND Status_Code = 'LED'
      AND IsTGStatusOverride = 'N'
  `);
};

export const updateToLEChecking = async () => {
  return execute(`
    UPDATE TG
    SET TG_LastUpdated = CURRENT_TIMESTAMP, Status_Code = 'LEC'
    WHERE LE_Checking_StartDate = CURRENT_DATE
      AND Status_Code = 'IEC'
      AND IsTGStatusOverride = 'N'
  `);
};

export const updateToSentToUpov = async () => {
  return execute(`
    UPDATE TG
    SET TG_LastUpdated = CURRENT_TIMESTAMP, CPI_date = CURRENT_TIMESTAMP, Status_Code = 'STU'
    WHERE DATE(LE_Checking_EndDate) + INTERVAL 1 DAY = CURRENT_DATE
      AND Status_Code = 'LEC'
      AND IsTGStatusOverride = 'N'
  `);
};

// ── TC-EDC pipeline (NEW) ─────────────────────────────────────────────────────

/**
 * TCD → ECC when ECC_StartDate = today.
 * Only transitions TGs in the TC or TC-EDC work party.
 */
export const updateToEccComments = async () => {
  return execute(`
    UPDATE TG
    SET TG_LastUpdated = CURRENT_TIMESTAMP, Status_Code = 'ECC'
    WHERE ECC_StartDate = CURRENT_DATE
      AND Status_Code = 'TCD'
      AND CPI_TechWorkParty IN ('TC', 'TC-EDC')
      AND IsTGStatusOverride = 'N'
  `);
};

/**
 * ECC → STU when ECC_EndDate + 1 day = today.
 */
export const updateToStuFromEcc = async () => {
  return execute(`
    UPDATE TG
    SET TG_LastUpdated = CURRENT_TIMESTAMP, Status_Code = 'STU'
    WHERE DATE(ECC_EndDate) + INTERVAL 1 DAY = CURRENT_DATE
      AND Status_Code = 'ECC'
      AND IsTGStatusOverride = 'N'
  `);
};