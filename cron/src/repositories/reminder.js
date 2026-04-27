import { query } from '../utils/db.js';

// ── TWP pipeline reminders (existing) ─────────────────────────────────────────

export const findPhaseStartReminders = async (startDateCol, endDateCol, daysOffset, statusCode, roleCode) => {
  return query(`
    SELECT
      tg.TG_ID as tgId,
      tg.TG_Reference as tgReference,
      tg.${startDateCol} as startDate,
      tg.${endDateCol} as endDate,
      up.User_ID as userId,
      up.PrimaryEmail as email,
      up.FirstName as firstName
    FROM TG tg
    JOIN Tg_Users tu ON tg.TG_ID = tu.TG_ID
    JOIN User_Profile up ON tu.User_ID = up.User_ID
    WHERE DATE(tg.${startDateCol}) = CURRENT_DATE + INTERVAL ? DAY
      AND tg.Status_Code = ?
      AND tu.Role_Code = ?
  `, [daysOffset, statusCode, roleCode]);
};

export const findPhaseEndReminders = async (startDateCol, endDateCol, daysOffset, statusCode, roleCode) => {
  return query(`
    SELECT
      tg.TG_ID as tgId,
      tg.TG_Reference as tgReference,
      tg.${startDateCol} as startDate,
      tg.${endDateCol} as endDate,
      up.User_ID as userId,
      up.PrimaryEmail as email,
      up.FirstName as firstName
    FROM TG tg
    JOIN Tg_Users tu ON tg.TG_ID = tu.TG_ID
    JOIN User_Profile up ON tu.User_ID = up.User_ID
    WHERE DATE(tg.${endDateCol}) = CURRENT_DATE + INTERVAL ? DAY
      AND tg.Status_Code = ?
      AND tu.Role_Code = ?
  `, [daysOffset, statusCode, roleCode]);
};

// ── TC-EDC pipeline reminders (NEW) ───────────────────────────────────────────

/**
 * Find EDC members who should receive an ECC start reminder today.
 * Recipients are EDC members for the TC-EDC session that owns the TG.
 *
 * @param {number} daysOffset - 0 for start date, 7 for 7 days before end
 */
export const findEccStartReminders = async (daysOffset) => {
  return query(`
    SELECT
      tg.TG_ID as tgId,
      tg.TG_Reference as tgReference,
      tg.ECC_StartDate as startDate,
      tg.ECC_EndDate as endDate,
      up.User_ID as userId,
      up.PrimaryEmail as email,
      up.FirstName as firstName
    FROM TG tg
    JOIN EDC_Members em ON em.TB_CodeID = (
      SELECT tb.TB_CodeID
      FROM technical_body tb
      WHERE tb.TB_Code IN ('TC', 'TC-EDC')
      ORDER BY tb.TB_Year DESC
      LIMIT 1
    )
    JOIN User_Profile up ON em.user_id = up.User_ID
    WHERE DATE(tg.ECC_StartDate) = CURRENT_DATE + INTERVAL ? DAY
      AND tg.Status_Code = 'TCD'
      AND tg.CPI_TechWorkParty IN ('TC', 'TC-EDC')
  `, [daysOffset]);
};

/**
 * Find EDC members who should receive an ECC end-approaching reminder.
 *
 * @param {number} daysOffset - number of days before ECC_EndDate
 */
export const findEccEndReminders = async (daysOffset) => {
  return query(`
    SELECT
      tg.TG_ID as tgId,
      tg.TG_Reference as tgReference,
      tg.ECC_StartDate as startDate,
      tg.ECC_EndDate as endDate,
      up.User_ID as userId,
      up.PrimaryEmail as email,
      up.FirstName as firstName
    FROM TG tg
    JOIN EDC_Members em ON em.TB_CodeID = (
      SELECT tb.TB_CodeID
      FROM technical_body tb
      WHERE tb.TB_Code IN ('TC', 'TC-EDC')
      ORDER BY tb.TB_Year DESC
      LIMIT 1
    )
    JOIN User_Profile up ON em.user_id = up.User_ID
    WHERE DATE(tg.ECC_EndDate) = CURRENT_DATE + INTERVAL ? DAY
      AND tg.Status_Code = 'ECC'
      AND tg.CPI_TechWorkParty IN ('TC', 'TC-EDC')
  `, [daysOffset]);
};