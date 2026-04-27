import { resolveUsername } from '../utils/resolve-user.js';
import { findByUsername } from '../repositories/user.js';
import { queryOne, getPool } from '../utils/db.js';

/**
 * POST /api/test-guidelines/:id/comments
 *
 * Saves or updates the current user's comment for a specific chapter.
 * Upsert pattern — one row per (TG_ID, User_ID, Chapter_Name).
 *
 * Allowed when TG status is IEC or ECC (admin always allowed).
 *
 * Body: { chapterName: string, sectionName?: string, comments: string }
 */
export const submitComment = async (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const username = resolveUsername(c);
  const dbUser = await findByUsername(username);
  if (!dbUser) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } }, 401);
  }

  const tg = await queryOne('SELECT TG_ID, Status_Code FROM TG WHERE TG_ID = ?', [tgId]);
  if (!tg) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Test guideline not found' } }, 404);
  }

  const COMMENT_STATUSES = ['IEC', 'ECC'];
  if (dbUser.roleCode !== 'ADM' && !COMMENT_STATUSES.includes(tg.Status_Code)) {
    return c.json({
      error: { code: 'INVALID_STATE', message: `Comments can only be submitted during IEC or ECC phase. Current: ${tg.Status_Code}` },
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

  // Upsert: one comment per user per chapter
  const existing = await queryOne(
    `SELECT IEComments_ID FROM TG_IEComments
     WHERE TG_ID = ? AND User_ID = ? AND Chapter_Name = ?
       AND (Section_Name = ? OR (Section_Name IS NULL AND ? IS NULL))`,
    [tgId, dbUser.id, chapterName, sectionName, sectionName]
  );

  if (existing) {
    await pool.query(
      `UPDATE TG_IEComments SET Comments = ?, LastUpdated = NOW()
       WHERE IEComments_ID = ?`,
      [comments, existing.IEComments_ID]
    );
    return c.json({ id: existing.IEComments_ID, updated: true });
  }

  const [result] = await pool.query(
    `INSERT INTO TG_IEComments (TG_ID, User_ID, Chapter_Name, Section_Name, Comments, LastUpdated)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [tgId, dbUser.id, chapterName, sectionName, comments]
  );
  return c.json({ id: result.insertId, updated: false }, 201);
};

/**
 * GET /api/test-guidelines/:id/my-comments
 *
 * Returns the current user's own comments on this TG.
 * Used to pre-populate the CommentPanel when navigating the editor.
 */
export const getMyComments = async (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const username = resolveUsername(c);
  const dbUser = await findByUsername(username);
  if (!dbUser) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } }, 401);
  }

  const { query } = await import('../utils/db.js');
  const rows = await query(
    `SELECT
       IEComments_ID as id,
       Chapter_Name  as chapterName,
       Section_Name  as sectionName,
       Comments      as comments,
       LastUpdated   as lastUpdated
     FROM TG_IEComments
     WHERE TG_ID = ? AND User_ID = ? AND Comments != ''
     ORDER BY Chapter_Name`,
    [tgId, dbUser.id]
  );

  return c.json(rows);
};