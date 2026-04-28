import { resolveUsername } from '../utils/resolve-user.js';
import { findByUsername } from '../repositories/user.js';
import { queryOne, query, getPool } from '../utils/db.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

async function resolveUser(c) {
  const username = resolveUsername(c);
  const dbUser = await findByUsername(username);
  if (!dbUser) {
    c.json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } }, 401);
    return { dbUser: null };
  }
  return { dbUser };
}

async function resolveTg(c, tgId) {
  const tg = await queryOne(
    'SELECT TG_ID, Status_Code, CPI_TechWorkParty FROM TG WHERE TG_ID = ?',
    [tgId]
  );
  if (!tg) {
    c.json({ error: { code: 'NOT_FOUND', message: 'Test guideline not found' } }, 404);
    return { tg: null };
  }
  return { tg };
}

/**
 * Verify that the calling user is an EDC member for the session that owns
 * this TG — mirrors the same check done in editor-auth middleware.
 * ADM is exempt (always allowed).
 *
 * Returns true if access is allowed, false (+ writes 403) if not.
 */
async function assertEdcAccess(c, dbUser, tgId, tg) {
  if (dbUser.roleCode === 'ADM') return true;

  // TG must be a TC or TC-EDC work party
  if (!['TC', 'TC-EDC'].includes(tg.CPI_TechWorkParty)) {
    c.json({
      error: {
        code: 'FORBIDDEN',
        message: 'EDC comments are only available for TC / TC-EDC test guidelines',
      },
    }, 403);
    return false;
  }

  // EDC role check
  if (dbUser.roleCode !== 'EDC') {
    c.json({
      error: { code: 'FORBIDDEN', message: 'Only EDC members can access EDC comments' },
    }, 403);
    return false;
  }

  // Membership check: user must be in EDC_Members for a TC/TC-EDC session
  const member = await queryOne(
    `SELECT em.TB_CodeID
     FROM EDC_Members em
     JOIN technical_body tb ON em.TB_CodeID = tb.TB_CodeID
     WHERE em.user_id = ?
       AND tb.TB_Code IN ('TC', 'TC-EDC')
       AND EXISTS (
         SELECT 1 FROM TG
         WHERE TG_ID = ?
           AND CPI_TechWorkParty IN ('TC', 'TC-EDC')
       )
     LIMIT 1`,
    [dbUser.id, tgId]
  );

  if (!member) {
    c.json({
      error: {
        code: 'FORBIDDEN',
        message: 'You are not an EDC member for the session that owns this test guideline',
      },
    }, 403);
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EDC COMMENT HANDLERS  (phase = ECC, table = TG_EDCComments)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/test-guidelines/:id/edc-comments
 *
 * EDC member submits (or updates) a comment for a chapter/section.
 * Upsert pattern — one row per (TG_ID, User_ID, Chapter_Name, Section_Name).
 *
 * Allowed roles / status:
 *   - EDC member → only during ECC phase
 *   - ADM        → always
 *
 * Body: { chapterName: string, sectionName?: string, comments: string }
 */
export const submitEdcComment = async (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { dbUser } = await resolveUser(c);
  if (!dbUser) return;

  const { tg } = await resolveTg(c, tgId);
  if (!tg) return;

  const allowed = await assertEdcAccess(c, dbUser, tgId, tg);
  if (!allowed) return;

  // Status guard: EDC can only comment during ECC (admin exempt)
  if (dbUser.roleCode !== 'ADM' && tg.Status_Code !== 'ECC') {
    return c.json({
      error: {
        code: 'INVALID_STATE',
        message: `EDC comments can only be submitted during ECC phase. Current: ${tg.Status_Code}`,
      },
    }, 409);
  }

  const body = await c.req.json().catch(() => ({}));
  const { chapterName, sectionName = null, comments } = body;

  if (!chapterName) {
    return c.json({ error: { code: 'VALIDATION', message: 'chapterName is required' } }, 400);
  }
  if (typeof comments !== 'string') {
    return c.json({ error: { code: 'VALIDATION', message: 'comments must be a string' } }, 400);
  }

  const pool = getPool();

  // Upsert: one EDC comment per user per chapter+section
  const existing = await queryOne(
    `SELECT EDCComments_ID FROM TG_EDCComments
     WHERE TG_ID = ? AND User_ID = ? AND Chapter_Name = ?
       AND (Section_Name = ? OR (Section_Name IS NULL AND ? IS NULL))`,
    [tgId, dbUser.id, chapterName, sectionName, sectionName]
  );

  if (existing) {
    await pool.query(
      `UPDATE TG_EDCComments
       SET Comments = ?, LastUpdated = NOW(), Modified_Time = NOW()
       WHERE EDCComments_ID = ?`,
      [comments, existing.EDCComments_ID]
    );
    return c.json({ id: existing.EDCComments_ID, updated: true });
  }

  const [result] = await pool.query(
    `INSERT INTO TG_EDCComments
       (TG_ID, User_ID, Chapter_Name, Section_Name, Comments,
        CharacteristicOrder, LastUpdated, Modified_Time, Created_Time)
     VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW(), NOW())`,
    [tgId, dbUser.id, chapterName, sectionName, comments]
  );
  return c.json({ id: result.insertId, updated: false }, 201);
};

/**
 * GET /api/test-guidelines/:id/edc-comments
 *
 * Returns ALL EDC comments for this TG (all members), grouped for admin
 * review and discussion draft preparation (TDD phase).
 *
 * Each comment includes the commenter's name and country.
 *
 * Accessible to: EDC members for this TG's session, ADM.
 * (LE / IE get 403 — EDC comments are TC-EDC internal)
 *
 * Response shape:
 * [
 *   {
 *     id, chapterName, sectionName, comments, lastUpdated, createdAt,
 *     edcName, edcCountry
 *   }
 * ]
 */
export const getEdcComments = async (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { dbUser } = await resolveUser(c);
  if (!dbUser) return;

  const { tg } = await resolveTg(c, tgId);
  if (!tg) return;

  const allowed = await assertEdcAccess(c, dbUser, tgId, tg);
  if (!allowed) return;

  const rows = await query(
    `SELECT
       ec.EDCComments_ID  AS id,
       ec.Chapter_Name    AS chapterName,
       ec.Section_Name    AS sectionName,
       ec.Comments        AS comments,
       ec.LastUpdated     AS lastUpdated,
       ec.Created_Time    AS createdAt,
       up.Full_Name       AS edcName,
       up.Office_Code     AS edcCountry
     FROM TG_EDCComments ec
     JOIN User_Profile up ON ec.User_ID = up.User_ID
     WHERE ec.TG_ID = ? AND (ec.Comments IS NOT NULL AND ec.Comments != '')
     ORDER BY ec.Chapter_Name, ec.Section_Name, ec.EDCComments_ID`,
    [tgId]
  );

  return c.json(rows);
};

/**
 * GET /api/test-guidelines/:id/my-edc-comments
 *
 * Returns only the calling EDC member's own comments for this TG.
 * Used to pre-populate the CommentPanel when navigating the editor.
 *
 * Accessible to: EDC members, ADM.
 */
export const getMyEdcComments = async (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { dbUser } = await resolveUser(c);
  if (!dbUser) return;

  const { tg } = await resolveTg(c, tgId);
  if (!tg) return;

  const allowed = await assertEdcAccess(c, dbUser, tgId, tg);
  if (!allowed) return;

  const rows = await query(
    `SELECT
       EDCComments_ID  AS id,
       Chapter_Name    AS chapterName,
       Section_Name    AS sectionName,
       Comments        AS comments,
       LastUpdated     AS lastUpdated,
       Created_Time    AS createdAt
     FROM TG_EDCComments
     WHERE TG_ID = ? AND User_ID = ?
       AND (Comments IS NOT NULL AND Comments != '')
     ORDER BY Chapter_Name, Section_Name`,
    [tgId, dbUser.id]
  );

  return c.json(rows);
};