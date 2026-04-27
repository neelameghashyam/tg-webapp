import { resolveUsername } from '../utils/resolve-user.js';
import { findByUsername } from '../repositories/user.js';
import { queryOne, query, getPool } from '../utils/db.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve and authenticate the current user. Returns {dbUser} or writes error. */
async function resolveUser(c) {
  const username = resolveUsername(c);
  const dbUser = await findByUsername(username);
  if (!dbUser) {
    c.json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } }, 401);
    return { dbUser: null };
  }
  return { dbUser };
}

/** Fetch TG row or write 404. */
async function resolveTg(c, tgId) {
  const tg = await queryOne('SELECT TG_ID, Status_Code FROM TG WHERE TG_ID = ?', [tgId]);
  if (!tg) {
    c.json({ error: { code: 'NOT_FOUND', message: 'Test guideline not found' } }, 404);
    return { tg: null };
  }
  return { tg };
}

// ─────────────────────────────────────────────────────────────────────────────
// IE COMMENT HANDLERS  (phase = IEC, table = TG_IEComments)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/test-guidelines/:id/comments
 *
 * IE submits (or updates) a comment for a chapter/section.
 * One row per (TG_ID, User_ID, Chapter_Name, Section_Name) — upsert pattern.
 *
 * Allowed roles / statuses:
 *   - IE  → only during IEC
 *   - ADM → always (so admins can fix / test)
 *
 * Body: { chapterName, sectionName?, comments }
 */
export const submitComment = async (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { dbUser } = await resolveUser(c);
  if (!dbUser) return;

  const { tg } = await resolveTg(c, tgId);
  if (!tg) return;

  // Role guard: only IE and ADM may write IE comments
  if (!['IE', 'ADM'].includes(dbUser.roleCode)) {
    return c.json({
      error: { code: 'FORBIDDEN', message: 'Only IE users can submit IE comments' },
    }, 403);
  }

  // Status guard: must be IEC (admin exempt)
  if (dbUser.roleCode !== 'ADM' && tg.Status_Code !== 'IEC') {
    return c.json({
      error: {
        code: 'INVALID_STATE',
        message: `IE comments can only be submitted during IEC phase. Current: ${tg.Status_Code}`,
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

  // Upsert: one IE comment per user per chapter+section
  const existing = await queryOne(
    `SELECT IEComments_ID FROM TG_IEComments
     WHERE TG_ID = ? AND User_ID = ? AND Chapter_Name = ?
       AND (Section_Name = ? OR (Section_Name IS NULL AND ? IS NULL))`,
    [tgId, dbUser.id, chapterName, sectionName, sectionName]
  );

  if (existing) {
    await pool.query(
      `UPDATE TG_IEComments
       SET Comments = ?, LastUpdated = NOW(), Modified_Time = NOW()
       WHERE IEComments_ID = ?`,
      [comments, existing.IEComments_ID]
    );
    return c.json({ id: existing.IEComments_ID, updated: true });
  }

  const [result] = await pool.query(
    `INSERT INTO TG_IEComments
       (TG_ID, User_ID, Chapter_Name, Section_Name, Comments,
        CharacteristicOrder, LastUpdated, Modified_Time, Created_Time)
     VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW(), NOW())`,
    [tgId, dbUser.id, chapterName, sectionName, comments]
  );
  return c.json({ id: result.insertId, updated: false }, 201);
};

/**
 * GET /api/test-guidelines/:id/my-comments
 *
 * Returns the calling IE user's own comments on this TG.
 * Used to pre-populate the CommentPanel when navigating the editor.
 */
export const getMyComments = async (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { dbUser } = await resolveUser(c);
  if (!dbUser) return;

  const rows = await query(
    `SELECT
       IEComments_ID  AS id,
       Chapter_Name   AS chapterName,
       Section_Name   AS sectionName,
       Comments       AS comments,
       LastUpdated    AS lastUpdated,
       Created_Time   AS createdAt
     FROM TG_IEComments
     WHERE TG_ID = ? AND User_ID = ? AND Comments != ''
     ORDER BY Chapter_Name, Section_Name`,
    [tgId, dbUser.id]
  );

  return c.json(rows);
};

// ─────────────────────────────────────────────────────────────────────────────
// LE REPLY HANDLERS  (table = TG_LEComments — threaded replies to IE comments)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/test-guidelines/:id/le-comments
 *
 * Returns all IE comments for this TG together with all their LE replies.
 *
 * IEComments_ID in TG_LEComments is a MUL index (not UNIQUE), so multiple
 * LE users can each reply to the same IE comment — leReplies is an array.
 *
 * Shape returned:
 * [
 *   {
 *     id, chapterName, sectionName, comments, lastUpdated, createdAt,
 *     ieName, ieCountry,
 *     leReplies: [{ id, comments, leName, leCountry, lastUpdated, createdAt }]
 *                 — empty array when no replies yet
 *   }
 * ]
 *
 * Accessible to: LE, ADM.
 */
export const getLeComments = async (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { dbUser } = await resolveUser(c);
  if (!dbUser) return;

  // ADM + LE may access; IE/EDC get 403
  if (!['LE', 'ADM'].includes(dbUser.roleCode)) {
    return c.json({
      error: { code: 'FORBIDDEN', message: 'Only LE users or admins can view LE comments' },
    }, 403);
  }

  // Fetch all IE comments for this TG
  const ieRows = await query(
    `SELECT
       ic.IEComments_ID  AS id,
       ic.Chapter_Name   AS chapterName,
       ic.Section_Name   AS sectionName,
       ic.Comments       AS comments,
       ic.LastUpdated    AS lastUpdated,
       ic.Created_Time   AS createdAt,
       ie_up.Full_Name   AS ieName,
       ie_up.Office_Code AS ieCountry
     FROM TG_IEComments ic
     JOIN User_Profile ie_up ON ic.User_ID = ie_up.User_ID
     WHERE ic.TG_ID = ? AND ic.Comments != ''
     ORDER BY ic.Chapter_Name, ic.Section_Name, ic.IEComments_ID`,
    [tgId]
  );

  if (!ieRows.length) return c.json([]);

  // Fetch all LE replies for this TG in one query
  const leRows = await query(
    `SELECT
       lc.LEComments_ID  AS id,
       lc.IEComments_ID  AS ieCommentId,
       lc.comments       AS comments,
       lc.LastUpdated    AS lastUpdated,
       lc.Created_Time   AS createdAt,
       le_up.Full_Name   AS leName,
       le_up.Office_Code AS leCountry
     FROM TG_LEComments lc
     JOIN User_Profile le_up ON lc.LEUser_ID = le_up.User_ID
     WHERE lc.TG_ID = ? AND (lc.comments IS NOT NULL AND lc.comments != '')
     ORDER BY lc.IEComments_ID, lc.Created_Time`,
    [tgId]
  );

  // Group LE replies by IEComments_ID
  const repliesByIeId = {};
  for (const lr of leRows) {
    if (!repliesByIeId[lr.ieCommentId]) repliesByIeId[lr.ieCommentId] = [];
    repliesByIeId[lr.ieCommentId].push({
      id:          lr.id,
      comments:    lr.comments,
      leName:      lr.leName,
      leCountry:   lr.leCountry,
      lastUpdated: lr.lastUpdated,
      createdAt:   lr.createdAt,
    });
  }

  // Merge
  const shaped = ieRows.map((r) => ({
    id:          r.id,
    chapterName: r.chapterName,
    sectionName: r.sectionName,
    comments:    r.comments,
    lastUpdated: r.lastUpdated,
    createdAt:   r.createdAt,
    ieName:      r.ieName,
    ieCountry:   r.ieCountry,
    leReplies:   repliesByIeId[r.id] || [],
  }));

  return c.json(shaped);
};

/**
 * POST /api/test-guidelines/:id/le-comments
 *
 * LE submits or updates their reply to a specific IE comment.
 * One reply per IE comment (upsert on IEComments_ID + TG_ID).
 *
 * Allowed roles / statuses:
 *   - LE  → only during LEC phase
 *   - ADM → always
 *
 * Body: { ieCommentId: number, comments: string }
 */
export const submitLeComment = async (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { dbUser } = await resolveUser(c);
  if (!dbUser) return;

  const { tg } = await resolveTg(c, tgId);
  if (!tg) return;

  // Role guard
  if (!['LE', 'ADM'].includes(dbUser.roleCode)) {
    return c.json({
      error: { code: 'FORBIDDEN', message: 'Only LE users can submit LE replies' },
    }, 403);
  }

  // Status guard: LE can only reply during LEC (admin exempt)
  if (dbUser.roleCode !== 'ADM' && tg.Status_Code !== 'LEC') {
    return c.json({
      error: {
        code: 'INVALID_STATE',
        message: `LE replies can only be submitted during LEC phase. Current: ${tg.Status_Code}`,
      },
    }, 409);
  }

  const body = await c.req.json().catch(() => ({}));
  const { ieCommentId, comments } = body;

  if (!ieCommentId || typeof ieCommentId !== 'number') {
    return c.json({ error: { code: 'VALIDATION', message: 'ieCommentId (number) is required' } }, 400);
  }
  if (typeof comments !== 'string') {
    return c.json({ error: { code: 'VALIDATION', message: 'comments must be a string' } }, 400);
  }

  // Verify the IE comment belongs to this TG
  const ieComment = await queryOne(
    `SELECT IEComments_ID, User_ID FROM TG_IEComments
     WHERE IEComments_ID = ? AND TG_ID = ?`,
    [ieCommentId, tgId]
  );
  if (!ieComment) {
    return c.json({
      error: { code: 'NOT_FOUND', message: 'IE comment not found for this TG' },
    }, 404);
  }

  const pool = getPool();

  // Upsert: one LE reply per (IEComments_ID, LEUser_ID).
  // IEComments_ID is a MUL index — multiple LEs can each reply to the same
  // IE comment, but each LE can only have one reply per IE comment.
  const existing = await queryOne(
    `SELECT LEComments_ID FROM TG_LEComments
     WHERE IEComments_ID = ? AND TG_ID = ? AND LEUser_ID = ?`,
    [ieCommentId, tgId, dbUser.id]
  );

  if (existing) {
    await pool.query(
      `UPDATE TG_LEComments
       SET comments = ?, LastUpdated = NOW(), Modified_Time = NOW()
       WHERE LEComments_ID = ?`,
      [comments, existing.LEComments_ID]
    );
    return c.json({ id: existing.LEComments_ID, updated: true });
  }

  const [result] = await pool.query(
    `INSERT INTO TG_LEComments
       (TG_ID, IEComments_ID, IEUser_ID, LEUser_ID, comments,
        LastUpdated, Modified_Time, Created_Time)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
    [tgId, ieCommentId, ieComment.User_ID, dbUser.id, comments]
  );
  return c.json({ id: result.insertId, updated: false }, 201);
};

/**
 * GET /api/test-guidelines/:id/my-le-comments
 *
 * Returns only the calling LE user's own replies on this TG.
 * Useful for pre-populating the LE reply panel.
 */
export const getMyLeComments = async (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const { dbUser } = await resolveUser(c);
  if (!dbUser) return;

  if (!['LE', 'ADM'].includes(dbUser.roleCode)) {
    return c.json({
      error: { code: 'FORBIDDEN', message: 'Only LE users or admins can view LE comments' },
    }, 403);
  }

  const rows = await query(
    `SELECT
       lc.LEComments_ID     AS id,
       lc.IEComments_ID     AS ieCommentId,
       lc.comments          AS comments,
       lc.LastUpdated       AS lastUpdated,
       lc.Created_Time      AS createdAt,
       ic.Chapter_Name      AS chapterName,
       ic.Section_Name      AS sectionName
     FROM TG_LEComments lc
     JOIN TG_IEComments ic ON lc.IEComments_ID = ic.IEComments_ID
     WHERE lc.TG_ID = ? AND lc.LEUser_ID = ? AND (lc.comments IS NOT NULL AND lc.comments != '')
     ORDER BY ic.Chapter_Name, ic.Section_Name`,
    [tgId, dbUser.id]
  );

  return c.json(rows);
};