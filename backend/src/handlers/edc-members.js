/**
 * EDC Member Management
 *
 * Registered routes in app.js:
 *
 *   app.get('/api/admin/technical-bodies/:tbCodeId/edc-members',                   listEdcMembers);
 *   app.post('/api/admin/technical-bodies/:tbCodeId/edc-members',                  addEdcMembers);
 *   app.delete('/api/admin/technical-bodies/:tbCodeId/edc-members/:userId',        removeEdcMember);
 *   app.post('/api/admin/technical-bodies/:tbCodeId/edc-members/copy-from/:srcId', copyEdcMembers);  ← NEW
 */

import { query, queryOne, getPool } from '../utils/db.js';
import { findByUsername } from '../repositories/user.js';
import { resolveUsername } from '../utils/resolve-user.js';

async function requireAdminUser(c) {
  const username = resolveUsername(c);
  const dbUser = await findByUsername(username);
  if (!dbUser || dbUser.roleCode !== 'ADM') {
    return {
      dbUser: null,
      error: c.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, 403),
    };
  }
  return { dbUser, error: null };
}

// ─── helper: check a TB row exists ────────────────────────────────────────────

async function findTbById(id) {
  const rows = await query(
    'SELECT TB_CodeID AS id, TB_Code AS code, TB_Year AS year FROM technical_body WHERE TB_CodeID = ?',
    [id],
  );
  return rows[0] || null;
}

/**
 * GET /api/admin/technical-bodies/:tbCodeId/edc-members
 *
 * List EDC members for a TC-EDC session.
 */
export const listEdcMembers = async (c) => {
  const { error: authErr } = await requireAdminUser(c);
  if (authErr) return authErr;

  const tbCodeId = parseInt(c.req.param('tbCodeId'), 10);
  if (!tbCodeId)
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TB Code ID' } }, 400);

  const members = await query(
    `SELECT
      up.User_ID       AS id,
      up.Full_Name     AS fullName,
      up.PrimaryEmail  AS email,
      up.Office_Code   AS officeCode
     FROM  EDC_Members  em
     JOIN  User_Profile up ON em.user_id = up.User_ID
     WHERE em.TB_CodeID = ?
     ORDER BY up.Full_Name`,
    [tbCodeId],
  );

  return c.json(members);
};

/**
 * POST /api/admin/technical-bodies/:tbCodeId/edc-members
 *
 * Body: { userIds: number[] }
 * Add one or more users as EDC members. Ignores duplicates (INSERT IGNORE).
 */
export const addEdcMembers = async (c) => {
  const { error: authErr } = await requireAdminUser(c);
  if (authErr) return authErr;

  const tbCodeId = parseInt(c.req.param('tbCodeId'), 10);
  if (!tbCodeId)
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TB Code ID' } }, 400);

  const body    = await c.req.json().catch(() => ({}));
  const userIds = Array.isArray(body.userIds)
    ? body.userIds.map(Number).filter(Boolean)
    : [];

  if (!userIds.length) {
    return c.json(
      { error: { code: 'VALIDATION', message: 'userIds array is required and must not be empty' } },
      400,
    );
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    for (const userId of userIds) {
      await conn.execute(
        'INSERT IGNORE INTO EDC_Members (user_id, TB_CodeID) VALUES (?, ?)',
        [userId, tbCodeId],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return c.json({ added: userIds.length, tbCodeId });
};

/**
 * DELETE /api/admin/technical-bodies/:tbCodeId/edc-members/:userId
 *
 * Remove a user from a TC-EDC session.
 */
export const removeEdcMember = async (c) => {
  const { error: authErr } = await requireAdminUser(c);
  if (authErr) return authErr;

  const tbCodeId = parseInt(c.req.param('tbCodeId'), 10);
  const userId   = parseInt(c.req.param('userId'), 10);
  if (!tbCodeId || !userId) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid TB Code ID or User ID' } },
      400,
    );
  }

  await getPool().query(
    'DELETE FROM EDC_Members WHERE user_id = ? AND TB_CodeID = ?',
    [userId, tbCodeId],
  );

  return c.json({ removed: true, userId, tbCodeId });
};

/**
 * POST /api/admin/technical-bodies/:tbCodeId/edc-members/copy-from/:srcId
 *
 * Copy all EDC members from an older session (srcId) into a new session
 * (tbCodeId). Members that already exist in the target are silently skipped
 * (INSERT IGNORE), so the operation is fully idempotent.
 *
 * Response:
 *   { copied: number, skipped: number, targetTbCodeId: number, sourceTbCodeId: number }
 *
 * Errors:
 *   400  – either ID is invalid
 *   404  – source or target session not found in technical_body table
 *   403  – caller is not an admin
 */
export const copyEdcMembers = async (c) => {
  const { error: authErr } = await requireAdminUser(c);
  if (authErr) return authErr;

  const targetId = parseInt(c.req.param('tbCodeId'), 10);
  const sourceId = parseInt(c.req.param('srcId'), 10);

  if (!targetId || !sourceId) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid source or target TB Code ID' } },
      400,
    );
  }

  if (targetId === sourceId) {
    return c.json(
      { error: { code: 'BAD_REQUEST', message: 'Source and target sessions must be different' } },
      400,
    );
  }

  // Validate both sessions exist
  const [targetTb, sourceTb] = await Promise.all([
    findTbById(targetId),
    findTbById(sourceId),
  ]);

  if (!targetTb) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: `Target session (id=${targetId}) not found` } },
      404,
    );
  }
  if (!sourceTb) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: `Source session (id=${sourceId}) not found` } },
      404,
    );
  }

  // Fetch all user IDs from the source session
  const sourceMembers = await query(
    'SELECT user_id FROM EDC_Members WHERE TB_CodeID = ?',
    [sourceId],
  );

  if (!sourceMembers.length) {
    return c.json({
      copied:          0,
      skipped:         0,
      targetTbCodeId:  targetId,
      sourceTbCodeId:  sourceId,
      message:         `Source session (${sourceTb.code} ${sourceTb.year}) has no EDC members to copy.`,
    });
  }

  // Fetch already-existing members in the target to compute skipped count
  const existingRows = await query(
    'SELECT user_id FROM EDC_Members WHERE TB_CodeID = ?',
    [targetId],
  );
  const existingIds = new Set(existingRows.map((r) => r.user_id));

  const conn = await getPool().getConnection();
  let inserted = 0;
  try {
    await conn.beginTransaction();
    for (const { user_id } of sourceMembers) {
      const [result] = await conn.execute(
        'INSERT IGNORE INTO EDC_Members (user_id, TB_CodeID) VALUES (?, ?)',
        [user_id, targetId],
      );
      // affectedRows = 1 → new row inserted; 0 → duplicate silently skipped
      if (result.affectedRows > 0) inserted++;
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const skipped = sourceMembers.length - inserted;

  return c.json({
    copied:         inserted,
    skipped,
    targetTbCodeId: targetId,
    sourceTbCodeId: sourceId,
    message: `Copied ${inserted} member${inserted !== 1 ? 's' : ''} from ${sourceTb.code} ${sourceTb.year}${skipped > 0 ? ` (${skipped} already present, skipped)` : ''}.`,
  });
};