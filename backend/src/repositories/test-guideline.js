import { query, queryOne } from '../utils/db.js';

/**
 * List test guidelines with optional status filter
 */
const INACTIVE_STATUSES = ['DEL', 'ADT', 'ADC', 'ABT', 'SSD', 'ARC'];

const TWP_DRAFTING_STATUSES  = ['CRT', 'LED', 'IEC', 'LEC', 'LES', 'STU'];
const TWP_DISCUSSION_STATUSES = ['TWD'];
const TC_EDC_DRAFTING_STATUSES  = ['TCD', 'ECC', 'STU'];
const TC_EDC_DISCUSSION_STATUSES = ['TDD'];

const TG_JOINS = `
    LEFT JOIN Tg_Users tu ON tg.TG_ID = tu.TG_ID AND tu.Role_Code = 'LE'
    LEFT JOIN User_Profile up ON tu.User_ID = up.User_ID
    LEFT JOIN TG_UPOVCode tuc ON tg.TG_ID = tuc.TG_ID
    LEFT JOIN Upov_Code uc ON tuc.UpovCode_ID = uc.UpovCode_ID`;

function makePlaceholders(arr) {
  return arr.map(() => '?').join(', ');
}

/**
 * Build the WHERE fragment that restricts rows to the requested tab.
 *
 * New tabs (step 4):
 *  twp-drafting        → CRT, LED, IEC, LEC, LES, STU  (CRT filtered for non-admin in handler)
 *  twp-discussion      → TWD
 *  tc-edc-drafting     → TCD, ECC, STU
 *  tc-edc-discussion   → TDD
 *
 * Legacy tabs kept for backward compat during rollout:
 *  twp-drafts / tc-drafts → old logic (will be removed once FE is updated)
 */
function addTabFilter(tab, status) {
  let sql = '';
  const params = [];

  switch (tab) {
    // ── New tabs ─────────────────────────────────────────────────────────
    case 'twp-drafting':
      sql = ` AND tg.Status_Code IN (${makePlaceholders(TWP_DRAFTING_STATUSES)})`;
      params.push(...TWP_DRAFTING_STATUSES);
      break;
    case 'twp-discussion':
      sql = ` AND tg.Status_Code IN (${makePlaceholders(TWP_DISCUSSION_STATUSES)})`;
      params.push(...TWP_DISCUSSION_STATUSES);
      break;
    case 'tc-edc-drafting':
      sql = ` AND tg.Status_Code IN (${makePlaceholders(TC_EDC_DRAFTING_STATUSES)})`;
      params.push(...TC_EDC_DRAFTING_STATUSES);
      break;
    case 'tc-edc-discussion':
      sql = ` AND tg.Status_Code IN (${makePlaceholders(TC_EDC_DISCUSSION_STATUSES)})`;
      params.push(...TC_EDC_DISCUSSION_STATUSES);
      break;

    // ── Terminal / flat tabs ──────────────────────────────────────────────
    case 'adopted':
      sql = ` AND tg.Status_Code IN ('ADT', 'ADC')`;
      break;
    case 'archived':
      sql = ` AND tg.Status_Code = 'ARC'`;
      break;

    // ── Legacy (kept during FE migration) ────────────────────────────────
    case 'twp-drafts': {
      const ph = INACTIVE_STATUSES.map(() => '?').join(', ');
      sql = ` AND tg.Status_Code NOT IN (${ph})`;
      params.push(...INACTIVE_STATUSES);
      break;
    }
    case 'tc-drafts': {
      const ph = INACTIVE_STATUSES.map(() => '?').join(', ');
      sql = ` AND tg.Status_Code NOT IN (${ph})`;
      params.push(...INACTIVE_STATUSES);
      break;
    }
    case 'aborted':
      sql = ` AND tg.Status_Code = 'ABT'`;
      break;

    default:
      if (status) {
        sql = ' AND tg.Status_Code = ?';
        params.push(status);
      }
  }

  return { sql, params };
}

function addFilterConditions(filters = {}) {
  let whereSql = '';
  const whereParams = [];
  const havingConds = [];
  const havingParams = [];

  if (filters.search) {
    whereSql += ' AND (tg.TG_Reference LIKE ? OR tg.TG_Name LIKE ? OR up.Full_Name LIKE ?)';
    const term = `%${filters.search}%`;
    whereParams.push(term, term, term);
  }
  if (filters.name) {
    whereSql += ' AND tg.TG_Name LIKE ?';
    whereParams.push(`%${filters.name}%`);
  }
  if (filters.reference) {
    whereSql += ' AND tg.TG_Reference LIKE ?';
    whereParams.push(`%${filters.reference}%`);
  }
  if (filters.leadExpert) {
    whereSql += ' AND up.Full_Name LIKE ?';
    whereParams.push(`%${filters.leadExpert}%`);
  }
  if (filters.status) {
    whereSql += ' AND tg.Status_Code = ?';
    whereParams.push(filters.status);
  }
  if (filters.upovCodes) {
    havingConds.push("GROUP_CONCAT(DISTINCT uc.Upov_Code ORDER BY tuc.seqNumber SEPARATOR '||') LIKE ?");
    havingParams.push(`%${filters.upovCodes}%`);
  }
  if (filters.twp) {
    const twpValues = filters.twp.split(',').map((t) => t.trim()).filter(Boolean);
    if (twpValues.length === 1) {
      whereSql += ' AND tg.CPI_TechWorkParty = ?';
      whereParams.push(twpValues[0]);
    } else if (twpValues.length > 1) {
      const ph = twpValues.map(() => '?').join(',');
      whereSql += ` AND tg.CPI_TechWorkParty IN (${ph})`;
      whereParams.push(...twpValues);
    }
  }

  const havingSql = havingConds.length ? ` HAVING ${havingConds.join(' AND ')}` : '';
  const needsJoins = !!(filters.search || filters.leadExpert || filters.upovCodes);
  return { whereSql, whereParams, havingSql, havingParams, needsJoins };
}

function addUserTwpFilter(userTwps) {
  if (!userTwps) return { sql: '', params: [] };
  const list = Array.isArray(userTwps)
    ? userTwps
    : userTwps.split(',').map((t) => t.trim()).filter(Boolean);
  if (!list.length) return { sql: '', params: [] };
  const ph = list.map(() => '?').join(',');
  return { sql: ` AND tg.CPI_TechWorkParty IN (${ph})`, params: list };
}

export const findAll = async ({ tab, status, limit, offset, filters = {}, sortDir, userTwps = null, isAdmin = false }) => {
  let sql = `
    SELECT
      tg.TG_ID as id,
      tg.TG_Reference as reference,
      tg.TG_Name as name,
      tg.Status_Code as status,
      tg.TG_LastUpdated as lastUpdated,
      tg.TG_AdoptionDate as adoptionDate,
      (SELECT MAX(h.Modification_Time) FROM tg_history_log h WHERE h.TG_ID = tg.TG_ID AND h.Status_Code = tg.Status_Code) as statusDate,
      up.Full_Name as leadExpert,
      up.Office_Code as leadExpertCountry,
      GROUP_CONCAT(DISTINCT uc.Upov_Code ORDER BY tuc.seqNumber SEPARATOR '||') as upovCodes,
      tg.CPI_TechWorkParty as twps,
      (SELECT COUNT(*) FROM TG_IEComments ic WHERE ic.TG_ID = tg.TG_ID AND ic.Comments != '') as ieCommentCount,
      CASE tg.Status_Code
        WHEN 'LED' THEN tg.LE_Draft_StartDate
        WHEN 'IEC' THEN tg.IE_Comments_StartDate
        WHEN 'LEC' THEN tg.LE_Checking_StartDate
        WHEN 'ECC' THEN tg.ECC_StartDate
        ELSE NULL
      END as periodStart,
      CASE tg.Status_Code
        WHEN 'LED' THEN tg.LE_Draft_EndDate
        WHEN 'IEC' THEN tg.IE_Comments_EndDate
        WHEN 'LEC' THEN tg.LE_Checking_EndDate
        WHEN 'ECC' THEN tg.ECC_EndDate
        ELSE NULL
      END as periodEnd
    FROM TG tg ${TG_JOINS}
    WHERE tg.Status_Code != 'DEL'
  `;

  const params = [];
  const tabCond = addTabFilter(tab, status);
  sql += tabCond.sql;
  params.push(...tabCond.params);

  // Non-admin: hide CRT rows in twp-drafting tab
  if (!isAdmin && tab === 'twp-drafting') {
    sql += ` AND tg.Status_Code != 'CRT'`;
  }

  // TWP filter (scoped to user's assigned TWPs)
  const twpCond = addUserTwpFilter(userTwps);
  sql += twpCond.sql;
  params.push(...twpCond.params);

  const { whereSql, whereParams, havingSql, havingParams } = addFilterConditions(filters);
  sql += whereSql;
  params.push(...whereParams);

  sql += ` GROUP BY tg.TG_ID${havingSql}`;

  if (sortDir === 'asc') {
    sql += ' ORDER BY tg.TG_LastUpdated ASC';
  } else {
    sql += ' ORDER BY tg.TG_LastUpdated DESC';
  }

  if (limit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }

  params.push(...havingParams);
  return query(sql, params);
};

export const countAll = async (tab, filters = {}, userTwps = null, isAdmin = false) => {
  let sql = `
    SELECT COUNT(DISTINCT tg.TG_ID) as total
    FROM TG tg ${TG_JOINS}
    WHERE tg.Status_Code != 'DEL'
  `;
  const params = [];

  const tabCond = addTabFilter(tab, null);
  sql += tabCond.sql;
  params.push(...tabCond.params);

  if (!isAdmin && tab === 'twp-drafting') {
    sql += ` AND tg.Status_Code != 'CRT'`;
  }

  const twpCond = addUserTwpFilter(userTwps);
  sql += twpCond.sql;
  params.push(...twpCond.params);

  const { whereSql, whereParams } = addFilterConditions(filters);
  sql += whereSql;
  params.push(...whereParams);

  const result = await queryOne(sql, params);
  return parseInt(result?.total || 0, 10);
};

export const findById = async (id) => {
  return queryOne(
    `SELECT
      tg.TG_ID as id,
      tg.TG_Reference as reference,
      tg.TG_Name as name,
      tg.Status_Code as status,
      tg.TG_LastUpdated as lastUpdated,
      tg.TG_AdoptionDate as adoptionDate,
      (SELECT MAX(h.Modification_Time) FROM tg_history_log h WHERE h.TG_ID = tg.TG_ID AND h.Status_Code = tg.Status_Code) as statusDate,
      tg.CPI_Original as language,
      tg.CPI_TechWorkParty as twps,
      tg.AdminComments as adminComments,
      up.Full_Name as leadExpert,
      up.Office_Code as leadExpertCountry,
      GROUP_CONCAT(DISTINCT uc.Upov_Code ORDER BY tuc.seqNumber SEPARATOR '||') as upovCodes,
      DATE_FORMAT(tg.LE_Draft_StartDate,    '%Y-%m-%d') as leDraftStart,
      DATE_FORMAT(tg.LE_Draft_EndDate,      '%Y-%m-%d') as leDraftEnd,
      DATE_FORMAT(tg.IE_Comments_StartDate, '%Y-%m-%d') as ieCommentsStart,
      DATE_FORMAT(tg.IE_Comments_EndDate,   '%Y-%m-%d') as ieCommentsEnd,
      DATE_FORMAT(tg.LE_Checking_StartDate, '%Y-%m-%d') as leCheckingStart,
      DATE_FORMAT(tg.LE_Checking_EndDate,   '%Y-%m-%d') as leCheckingEnd,
      DATE_FORMAT(tg.ECC_StartDate,         '%Y-%m-%d') as eccStart,
      DATE_FORMAT(tg.ECC_EndDate,           '%Y-%m-%d') as eccEnd
    FROM TG tg ${TG_JOINS}
    WHERE tg.TG_ID = ? AND tg.Status_Code != 'DEL'
    GROUP BY tg.TG_ID`,
    [id]
  );
};

export const findUsersByTgId = async (id) => {
  return query(
    `SELECT
      up.User_ID as id,
      up.Full_Name as fullName,
      up.PrimaryEmail as email,
      tu.Role_Code as role,
      up.Office_Code as country
    FROM Tg_Users tu
    JOIN User_Profile up ON tu.User_ID = up.User_ID
    WHERE tu.TG_ID = ?`,
    [id]
  );
};

export const countIeComments = async (id) => {
  const result = await queryOne(
    `SELECT COUNT(*) as total FROM TG_IEComments WHERE TG_ID = ? AND Comments != ''`,
    [id]
  );
  return parseInt(result?.total || 0, 10);
};

export const findIeComments = async (id) => {
  return query(
    `SELECT
      ic.IEComments_ID as id,
      ic.Chapter_Name as chapterName,
      ic.Section_Name as sectionName,
      ic.Comments as comments,
      ic.LastUpdated as lastUpdated,
      up.Full_Name as ieName,
      up.Office_Code as ieCountry
    FROM TG_IEComments ic
    JOIN User_Profile up ON ic.User_ID = up.User_ID
    WHERE ic.TG_ID = ? AND ic.Comments != ''
    ORDER BY ic.Chapter_Name, ic.Section_Name`,
    [id]
  );
};

export const countByTwp = async (tab) => {
  const tabCond = addTabFilter(tab, null);
  const sql = `
    SELECT tg.CPI_TechWorkParty as twp, COUNT(*) as cnt
    FROM TG tg
    WHERE tg.Status_Code != 'DEL'
    ${tabCond.sql}
    GROUP BY tg.CPI_TechWorkParty
  `;
  const rows = await query(sql, tabCond.params);
  const result = {};
  for (const row of rows) {
    result[row.twp] = parseInt(row.cnt, 10);
  }
  return result;
};

export const getStats = async (userTwps = null) => {
  const twpCond = addUserTwpFilter(userTwps);
  const inactivePh = INACTIVE_STATUSES.map(() => '?').join(',');
  const stats = await queryOne(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN tg.Status_Code = 'LED' THEN 1 ELSE 0 END) as draft,
      SUM(CASE WHEN tg.Status_Code = 'IEC' THEN 1 ELSE 0 END) as ieComments,
      SUM(CASE WHEN tg.Status_Code = 'LEC' THEN 1 ELSE 0 END) as leChecking,
      SUM(CASE WHEN tg.Status_Code NOT IN (${inactivePh}) THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN tg.Status_Code = 'ADT' THEN 1 ELSE 0 END) as adopted,
      SUM(CASE WHEN tg.Status_Code = 'ARC' THEN 1 ELSE 0 END) as archive,
      SUM(CASE WHEN tg.Status_Code = 'STU' THEN 1 ELSE 0 END) as submitted,
      SUM(CASE WHEN tg.Status_Code = 'ABT' THEN 1 ELSE 0 END) as aborted
    FROM TG tg
    WHERE tg.Status_Code != 'DEL'
    ${twpCond.sql}
  `, [...INACTIVE_STATUSES, ...twpCond.params]);

  return {
    total: parseInt(stats?.total || 0, 10),
    draft: parseInt(stats?.draft || 0, 10),
    ieComments: parseInt(stats?.ieComments || 0, 10),
    leChecking: parseInt(stats?.leChecking || 0, 10),
    active: parseInt(stats?.active || 0, 10),
    adopted: parseInt(stats?.adopted || 0, 10),
    archive: parseInt(stats?.archive || 0, 10),
    submitted: parseInt(stats?.submitted || 0, 10),
    aborted: parseInt(stats?.aborted || 0, 10),
  };
};