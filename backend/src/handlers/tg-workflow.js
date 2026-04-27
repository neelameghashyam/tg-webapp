/**
 * tg-workflow.js
 *
 * Admin-only workflow actions that create new TG copies and archive originals.
 * All handlers share:
 *  - Reference transform utility (pure string logic)
 *  - Deep-copy via createTg() from tg-create.repo.js
 *  - History logging
 *
 * Endpoints:
 *  POST   /api/admin/test-guidelines/:id/copy-for-discussion
 *  POST   /api/admin/test-guidelines/:id/start-new-project
 *  POST   /api/admin/test-guidelines/:id/submit-to-tc-edc
 *  POST   /api/admin/test-guidelines/:id/adopt
 *  PATCH  /api/admin/test-guidelines/:id/edc-comments
 */

import { resolveUsername } from '../utils/resolve-user.js';
import { findByUsername } from '../repositories/user.js';
import { queryOne, getPool } from '../utils/db.js';
import { createTg } from '../repositories/tg-create.repo.js';

// ─────────────────────────────────────────────────────────────────────────────
// Step 6 — Reference Transform Utility
// All logic is purely string-based. No stored proj number or suffix fields.
// ─────────────────────────────────────────────────────────────────────────────

const SUFFIX_TWP = ' with TWP comments';
const SUFFIX_EDC = ' with EDC Comments';

/**
 * Strip any known suffix from a reference string.
 */
function stripSuffix(ref) {
  if (ref.endsWith(SUFFIX_TWP)) return ref.slice(0, -SUFFIX_TWP.length);
  if (ref.endsWith(SUFFIX_EDC)) return ref.slice(0, -SUFFIX_EDC.length);
  return ref;
}

/**
 * Strip the (proj.N) segment entirely (for Adopt actions).
 * e.g. "TG/123/3(proj.3) with EDC Comments" → "TG/123/3"
 */
function stripProjNumber(ref) {
  return ref.replace(/\(proj\.\d+\)/, '').trim();
}

/**
 * Increment the (proj.N) number in a reference.
 * e.g. "TG/123/3(proj.2) with TWP comments" → stripped → "TG/123/3(proj.3)"
 * For legacy references without a (proj.N) segment, appends (proj.1) rather
 * than throwing, so that admin actions on older TGs do not silently fail.
 */
function incrementProjNumber(ref) {
  const base = stripSuffix(ref);
  const match = base.match(/^(.*\(proj\.)(\d+)(\).*)$/);
  if (!match) {
    // Legacy reference with no (proj.N) segment — default to (proj.1).
    console.warn(`incrementProjNumber: no (proj.N) in "${ref}", defaulting to (proj.1)`);
    return `${base}(proj.1)`;
  }
  const newN = parseInt(match[2], 10) + 1;
  return `${match[1]}${newN}${match[3]}`;
}

/**
 * Append the appropriate suffix based on pipeline.
 * Pipeline is determined by CPI_TechWorkParty:
 *   TC / TC-EDC → ' with EDC Comments'
 *   TWA/TWF/TWO/TWV → ' with TWP comments'
 */
function appendDiscussionSuffix(ref, techWorkParty) {
  if (['TC', 'TC-EDC'].includes(techWorkParty)) {
    return `${ref}${SUFFIX_EDC}`;
  }
  return `${ref}${SUFFIX_TWP}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

async function requireAdmin(c) {
  const username = resolveUsername(c);
  const dbUser = await findByUsername(username);
  if (!dbUser || dbUser.roleCode !== 'ADM') {
    return { dbUser: null, error: c.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, 403) };
  }
  return { dbUser, error: null };
}

async function requireTg(c, tgId, allowedStatuses) {
  const tg = await queryOne(
    `SELECT tg.TG_ID, tg.Status_Code, tg.CPI_TechWorkParty, tg.TG_Reference,
            tg.TG_Name, tg.CPI_Original, tg.AdminComments,
            IFNULL(ext.isMushroom, 'N') AS isMushroom
     FROM TG tg
     LEFT JOIN TG_Extended ext ON ext.TG_ID = tg.TG_ID
     WHERE tg.TG_ID = ?`,
    [tgId]
  );
  if (!tg) {
    return { tg: null, error: c.json({ error: { code: 'NOT_FOUND', message: 'Test guideline not found' } }, 404) };
  }
  if (allowedStatuses && !allowedStatuses.includes(tg.Status_Code)) {
    return {
      tg: null,
      error: c.json({
        error: { code: 'INVALID_STATE', message: `Action requires TG in status: ${allowedStatuses.join(', ')}. Current: ${tg.Status_Code}` },
      }, 409),
    };
  }
  return { tg, error: null };
}

async function fetchUpovCodes(tgId) {
  const { query } = await import('../utils/db.js');
  const rows = await query(
    `SELECT UpovCode_ID as id FROM TG_UPOVCode WHERE TG_ID = ? ORDER BY seqNumber`,
    [tgId]
  );
  return rows.map((r) => r.id);
}

async function logTransition(conn, tgId, newStatus, userId, comment) {
  // NOTE: Replace 'UserID' with the exact column name from your live DB.
  // Run: DESCRIBE tg_history_log; — common candidates: User_ID, UserID, Modified_By.
  // Wrapped in try/catch so a column-name mismatch never aborts the copy operation.
  try {
    await conn.execute(
      `INSERT INTO tg_history_log (TG_ID, Status_Code, UserID, Modification_Time, Comments)
       VALUES (?, ?, ?, NOW(), ?)`,
      [tgId, newStatus, userId, comment]
    );
  } catch (logErr) {
    console.warn('[tg-workflow] logTransition failed (check tg_history_log column names):', logErr.message);
  }
}

async function archiveTg(conn, tgId, userId) {
  await conn.execute(
    `UPDATE TG SET Status_Code = 'ARC', TG_LastUpdated = NOW() WHERE TG_ID = ?`,
    [tgId]
  );
  await logTransition(conn, tgId, 'ARC', userId, 'Archived by workflow action');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 7 — Copy for Discussion
// LES/STU (TWP) → TWD   | STU (TC-EDC) → TDD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/test-guidelines/:id/copy-for-discussion
 *
 * Creates a new discussion draft by deep-copying the source TG.
 * Pipeline is inferred from CPI_TechWorkParty:
 *   TWA/TWF/TWO/TWV → TWD (appends " with TWP comments")
 *   TC/TC-EDC        → TDD (appends " with EDC Comments")
 * Source TG is archived.
 */
export const copyForDiscussion = async (c) => {
  const { dbUser, error: authErr } = await requireAdmin(c);
  if (authErr) return authErr;

  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { tg, error: tgErr } = await requireTg(c, tgId, ['LES', 'STU']);
  if (tgErr) return tgErr;

  const isTcEdc = ['TC', 'TC-EDC'].includes(tg.CPI_TechWorkParty);
  const targetStatus = isTcEdc ? 'TDD' : 'TWD';
  const newRef = appendDiscussionSuffix(tg.TG_Reference, tg.CPI_TechWorkParty);

  const upovCodeIds = await fetchUpovCodes(tgId);

  // createTg with sourceId deep-copies chapters; archiveSource=true archives original
  const newTgId = await createTg({
    reference: newRef,
    name: tg.TG_Name,
    techWorkParty: tg.CPI_TechWorkParty,
    languageCode: tg.CPI_Original,
    isMushroom: tg.isMushroom,
    adminComments: tg.AdminComments,
    upovCodeIds,
    sourceId: tgId,
    archiveSource: true,
    targetStatus,
  });

  // Log the new TG creation
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await logTransition(conn, newTgId, targetStatus, dbUser.id, `Created from copy-for-discussion of TG #${tgId}`);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return c.json({ id: newTgId, reference: newRef, status: targetStatus });
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 8 — Start New Project / Submit to TC-EDC
// TWD/TDD → LED or TCD   |   TWD → TCD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/test-guidelines/:id/start-new-project
 *
 * Body: { targetStatus: 'LED' | 'TCD' }
 * Strips suffix, increments proj.N, creates new TG, archives source.
 */
export const startNewProject = async (c) => {
  const { dbUser, error: authErr } = await requireAdmin(c);
  if (authErr) return authErr;

  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const body = await c.req.json().catch(() => ({}));
  const { targetStatus } = body;
  if (!['LED', 'TCD'].includes(targetStatus)) {
    return c.json({ error: { code: 'VALIDATION', message: 'targetStatus must be "LED" or "TCD"' } }, 400);
  }

  const { tg, error: tgErr } = await requireTg(c, tgId, ['TWD', 'TDD']);
  if (tgErr) return tgErr;

  let newRef;
  try {
    newRef = incrementProjNumber(tg.TG_Reference);
  } catch (e) {
    return c.json({ error: { code: 'VALIDATION', message: e.message } }, 400);
  }

  const upovCodeIds = await fetchUpovCodes(tgId);

  const newTgId = await createTg({
    reference: newRef,
    name: tg.TG_Name,
    techWorkParty: tg.CPI_TechWorkParty,
    languageCode: tg.CPI_Original,
    isMushroom: tg.isMushroom,
    adminComments: tg.AdminComments,
    upovCodeIds,
    sourceId: tgId,
    archiveSource: true,
    targetStatus,
  });

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await logTransition(conn, newTgId, targetStatus, dbUser.id, `Created from start-new-project from TG #${tgId}`);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return c.json({ id: newTgId, reference: newRef, status: targetStatus });
};

/**
 * POST /api/admin/test-guidelines/:id/submit-to-tc-edc
 *
 * TWD → TCD. Strips " with TWP comments", increments proj.N.
 */
export const submitToTcEdc = async (c) => {
  const { dbUser, error: authErr } = await requireAdmin(c);
  if (authErr) return authErr;

  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { tg, error: tgErr } = await requireTg(c, tgId, ['TWD']);
  if (tgErr) return tgErr;

  let newRef;
  try {
    newRef = incrementProjNumber(tg.TG_Reference);
  } catch (e) {
    return c.json({ error: { code: 'VALIDATION', message: e.message } }, 400);
  }

  const upovCodeIds = await fetchUpovCodes(tgId);

  const newTgId = await createTg({
    reference: newRef,
    name: tg.TG_Name,
    techWorkParty: tg.CPI_TechWorkParty,
    languageCode: tg.CPI_Original,
    isMushroom: tg.isMushroom,
    adminComments: tg.AdminComments,
    upovCodeIds,
    sourceId: tgId,
    archiveSource: true,
    targetStatus: 'TCD',
  });

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await logTransition(conn, newTgId, 'TCD', dbUser.id, `Submitted to TC-EDC from TG #${tgId}`);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return c.json({ id: newTgId, reference: newRef, status: 'TCD' });
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 9 — Adopt / Adopt by Correspondence
// TDD → ADT or ADC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/test-guidelines/:id/adopt
 *
 * Body: { type: 'ADT' | 'ADC' }
 * Strips (proj.N) AND suffix entirely.
 * e.g. "TG/123/3(proj.3) with EDC Comments" → "TG/123/3"
 */
export const adopt = async (c) => {
  const { dbUser, error: authErr } = await requireAdmin(c);
  if (authErr) return authErr;

  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const body = await c.req.json().catch(() => ({}));
  const { type } = body;
  if (!['ADT', 'ADC'].includes(type)) {
    return c.json({ error: { code: 'VALIDATION', message: 'type must be "ADT" or "ADC"' } }, 400);
  }

  const { tg, error: tgErr } = await requireTg(c, tgId, ['TDD']);
  if (tgErr) return tgErr;

  // Strip (proj.N) and suffix
  const noSuffix = stripSuffix(tg.TG_Reference);
  const newRef = stripProjNumber(noSuffix);

  const upovCodeIds = await fetchUpovCodes(tgId);

  const newTgId = await createTg({
    reference: newRef,
    name: tg.TG_Name,
    techWorkParty: tg.CPI_TechWorkParty,
    languageCode: tg.CPI_Original,
    isMushroom: tg.isMushroom,
    adminComments: tg.AdminComments,
    upovCodeIds,
    sourceId: tgId,
    archiveSource: true,
    targetStatus: type,
  });

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await logTransition(conn, newTgId, type, dbUser.id, `Adopted (${type}) from TG #${tgId}`);
    // Set adoption date
    await conn.execute(
      `UPDATE TG SET TG_AdoptionDate = CURRENT_DATE WHERE TG_ID = ?`,
      [newTgId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return c.json({ id: newTgId, reference: newRef, status: type });
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 10 — Set EDC Comments dates
// PATCH /api/admin/test-guidelines/:id/edc-comments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/test-guidelines/:id/edc-comments
 *
 * Body: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
 * Sets ECC_StartDate and ECC_EndDate on TCD. No copy — cron handles TCD→ECC.
 *
 * Validation:
 *  - startDate must be in the future (so cron email fires correctly)
 *  - endDate must be after startDate
 */
export const setEdcCommentDates = async (c) => {
  const { error: authErr } = await requireAdmin(c);
  if (authErr) return authErr;

  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { tg, error: tgErr } = await requireTg(c, tgId, ['TCD']);
  if (tgErr) return tgErr;

  const body = await c.req.json().catch(() => ({}));
  const { startDate, endDate } = body;

  if (!startDate || !endDate) {
    return c.json({ error: { code: 'VALIDATION', message: 'startDate and endDate are required' } }, 400);
  }

  const start = new Date(startDate);
  const end   = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start <= today) {
    return c.json({ error: { code: 'VALIDATION', message: 'startDate must be in the future' } }, 400);
  }
  if (end <= start) {
    return c.json({ error: { code: 'VALIDATION', message: 'endDate must be after startDate' } }, 400);
  }

  await getPool().query(
    `UPDATE TG SET ECC_StartDate = ?, ECC_EndDate = ?, TG_LastUpdated = NOW() WHERE TG_ID = ?`,
    [startDate, endDate, tgId]
  );

  return c.json({ id: tgId, eccStartDate: startDate, eccEndDate: endDate });
};