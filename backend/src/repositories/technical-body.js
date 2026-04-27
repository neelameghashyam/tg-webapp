import { query, queryOne } from '../utils/db.js';

// ─── Shared SQL column list ────────────────────────────────────────────────────
// Extracted into a constant so findAll and findById stay in sync without
// copy-pasting the same column list.

const TB_COLUMNS = `
  TB_CodeID                                                       AS id,
  TB_Code                                                         AS code,
  TB_Desc                                                         AS description,
  TB_Year                                                         AS year,
  CPI_AtIts                                                       AS session,
  CPI_Tobeheldin                                                  AS location,
  DATE_FORMAT(CPI_DateFrom,               '%Y-%m-%d')             AS dateFrom,
  DATE_FORMAT(CPI_DateTo,                 '%Y-%m-%d')             AS dateTo,
  DATE_FORMAT(LE_Draft_StartDate,         '%Y-%m-%d')             AS leDraftStart,
  DATE_FORMAT(LE_Draft_EndDate,           '%Y-%m-%d')             AS leDraftEnd,
  DATE_FORMAT(IE_Comments_StartDate,      '%Y-%m-%d')             AS ieCommentsStart,
  DATE_FORMAT(IE_Comments_EndDate,        '%Y-%m-%d')             AS ieCommentsEnd,
  DATE_FORMAT(LE_Checking_StartDate,      '%Y-%m-%d')             AS leCheckingStart,
  DATE_FORMAT(LE_Checking_EndDate,        '%Y-%m-%d')             AS leCheckingEnd,
  DATE_FORMAT(Send_TO_UPOVDate,           '%Y-%m-%d')             AS sentToUpov,
  DATE_FORMAT(TG_Translator_StartDate,    '%Y-%m-%d')             AS translationStart,
  DATE_FORMAT(TG_Translator_EndDate,      '%Y-%m-%d')             AS translationEnd,
  DATE_FORMAT(TG_AdoptionDate,            '%Y-%m-%d')             AS adoptionDate,
  /* Requirement 1 – Member Count: correlated subquery avoids GROUP BY
     complexity and keeps the rest of the query untouched. */
  (
    SELECT COUNT(*)
    FROM   EDC_Members em
    WHERE  em.TB_CodeID = technical_body.TB_CodeID
  )                                                               AS memberCount`;

// ─── findAll ──────────────────────────────────────────────────────────────────

/**
 * List all technical body sessions, optionally filtered by year.
 * Returns memberCount for each row (always 0 for non TC/TC-EDC bodies).
 */
export const findAll = async (year = null) => {
  let sql = `SELECT ${TB_COLUMNS} FROM technical_body WHERE TB_Code NOT IN ('', '-1')`;
  const params = [];

  if (year) {
    sql += ' AND TB_Year = ?';
    params.push(year);
  }

  sql += ' ORDER BY TB_Year DESC, TB_Code';
  return query(sql, params);
};

// ─── findYears ────────────────────────────────────────────────────────────────

/**
 * Get distinct years that have technical body sessions.
 */
export const findYears = async () => {
  const rows = await query(
    `SELECT DISTINCT TB_Year AS year
     FROM   technical_body
     WHERE  TB_Code NOT IN ('', '-1') AND TB_Year IS NOT NULL
     ORDER  BY TB_Year DESC`,
  );
  return rows.map((r) => r.year);
};

// ─── findBodies ───────────────────────────────────────────────────────────────

/**
 * Get distinct body codes with their descriptions.
 */
export const findBodies = async () => {
  return query(
    `SELECT DISTINCT TB_Code AS code, TB_Desc AS description
     FROM   technical_body
     WHERE  TB_Code NOT IN ('', '-1') AND TB_Desc IS NOT NULL
     ORDER  BY TB_Code`,
  );
};

// ─── findById ─────────────────────────────────────────────────────────────────

/**
 * Get a single technical body session by primary key.
 * Includes memberCount (same correlated subquery as findAll).
 */
export const findById = async (id) => {
  return queryOne(
    `SELECT ${TB_COLUMNS} FROM technical_body WHERE TB_CodeID = ?`,
    [id],
  );
};

// ─── update ───────────────────────────────────────────────────────────────────

/**
 * Patch a technical body session with only the supplied fields.
 */
export const update = async (id, data) => {
  const fields = [];
  const params = [];

  const map = {
    session:          'CPI_AtIts',
    location:         'CPI_Tobeheldin',
    dateFrom:         'CPI_DateFrom',
    dateTo:           'CPI_DateTo',
    leDraftStart:     'LE_Draft_StartDate',
    leDraftEnd:       'LE_Draft_EndDate',
    ieCommentsStart:  'IE_Comments_StartDate',
    ieCommentsEnd:    'IE_Comments_EndDate',
    leCheckingStart:  'LE_Checking_StartDate',
    leCheckingEnd:    'LE_Checking_EndDate',
    sentToUpov:       'Send_TO_UPOVDate',
    translationStart: 'TG_Translator_StartDate',
    translationEnd:   'TG_Translator_EndDate',
    adoptionDate:     'TG_AdoptionDate',
  };

  for (const [key, col] of Object.entries(map)) {
    if (key in data) {
      fields.push(`${col} = ?`);
      params.push(data[key] || null);
    }
  }

  if (fields.length === 0) return;

  params.push(id);
  await query(
    `UPDATE technical_body SET ${fields.join(', ')} WHERE TB_CodeID = ?`,
    params,
  );
};

// ─── create ───────────────────────────────────────────────────────────────────

/**
 * Insert a new technical body session and return its new primary key.
 */
export const create = async (data) => {
  const result = await query(
    `INSERT INTO technical_body (
       TB_Code, TB_Desc, TB_Year, CPI_AtIts, CPI_Tobeheldin,
       CPI_DateFrom, CPI_DateTo,
       LE_Draft_StartDate,   LE_Draft_EndDate,
       IE_Comments_StartDate, IE_Comments_EndDate,
       LE_Checking_StartDate, LE_Checking_EndDate,
       Send_TO_UPOVDate, TG_Translator_StartDate, TG_Translator_EndDate,
       TG_AdoptionDate
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.code,                 data.description   || null, data.year,
      data.session    || null,   data.location       || null,
      data.dateFrom   || null,   data.dateTo         || null,
      data.leDraftStart  || null, data.leDraftEnd    || null,
      data.ieCommentsStart || null, data.ieCommentsEnd || null,
      data.leCheckingStart || null, data.leCheckingEnd || null,
      data.sentToUpov      || null,
      data.translationStart || null, data.translationEnd || null,
      data.adoptionDate     || null,
    ],
  );
  return result.insertId;
};

// ─── remove ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete a technical body session row.
 * Callers must invoke removeAllEdcMembers first to avoid FK violations.
 */
export const remove = async (id) => {
  await query('DELETE FROM technical_body WHERE TB_CodeID = ?', [id]);
};

// ─── removeAllEdcMembers ──────────────────────────────────────────────────────

/**
 * Requirement 3 – Cancel Session On The Fly (With Members):
 * Purge all EDC_Members rows for a session before deleting the session
 * itself. This prevents FK violations and guarantees no orphan rows remain.
 *
 * Called exclusively from the `del` handler so the cleanup is always
 * performed, regardless of how many members are present (including zero).
 */
export const removeAllEdcMembers = async (tbCodeId) => {
  await query('DELETE FROM EDC_Members WHERE TB_CodeID = ?', [tbCodeId]);
};