import { resolveUsername } from '../utils/resolve-user.js';
import { findByUsername } from '../repositories/user.js';
import { query, queryOne, getPool } from '../utils/db.js';

/**
 * POST /api/test-guidelines/:id/send-for-comments
 *
 * LE triggers LED → IEC early.
 * Cron is the fallback on IE_Comments_StartDate — this is the explicit early trigger.
 */
export const sendForComments = async (c) => {
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
  if (tg.Status_Code !== 'LED') {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Send for Comments is only available during LE Draft phase' } }, 409);
  }

  // Only the assigned LE (or admin) can trigger this
  if (dbUser.roleCode !== 'ADM') {
    const leAssignment = await queryOne(
      `SELECT 1 FROM Tg_Users WHERE TG_ID = ? AND User_ID = ? AND Role_Code = 'LE' AND Status_Code = 'A'`,
      [tgId, dbUser.id]
    );
    if (!leAssignment) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Only the assigned Leading Expert can send for comments' } }, 403);
    }
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE TG SET Status_Code = 'IEC', TG_LastUpdated = NOW() WHERE TG_ID = ?`,
      [tgId]
    );

    try {
      await conn.execute(
        `INSERT INTO tg_history_log (TG_ID, Status_Code, UserID, Modification_Time, Comments)
         VALUES (?, 'IEC', ?, NOW(), 'LE sent for comments (early)')`,
        [tgId, dbUser.id]
      );
    } catch (logErr) {
      console.warn('[tg-sign-off] sendForComments log failed:', logErr.message);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return c.json({ status: 'IEC', message: 'Sent for comments successfully' });
};

/**
 * POST /api/test-guidelines/:id/sign-off
 *
 * LE signs off during LEC phase → transitions to LES.
 */
export const signOff = async (c) => {
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
  if (tg.Status_Code !== 'LEC') {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Sign-off is only available during LE Checking phase' } }, 409);
  }

  if (dbUser.roleCode !== 'ADM') {
    const leAssignment = await queryOne(
      `SELECT 1 FROM Tg_Users WHERE TG_ID = ? AND User_ID = ? AND Role_Code = 'LE' AND Status_Code = 'A'`,
      [tgId, dbUser.id]
    );
    if (!leAssignment) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Only the assigned Leading Expert can sign off' } }, 403);
    }
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE TG SET Status_Code = 'LES', TG_LastUpdated = NOW() WHERE TG_ID = ?`,
      [tgId]
    );

    try {
      await conn.execute(
        `INSERT INTO tg_history_log (TG_ID, Status_Code, UserID, Modification_Time, Comments)
         VALUES (?, 'LES', ?, NOW(), 'LE signed off')`,
        [tgId, dbUser.id]
      );
    } catch (logErr) {
      console.warn('[tg-sign-off] signOff log failed:', logErr.message);
    }

    // Deactivate IE users
    await conn.execute(
      `UPDATE Tg_Users SET Status_Code = 'I' WHERE TG_ID = ? AND Role_Code = 'IE'`,
      [tgId]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return c.json({ status: 'LES', message: 'Successfully signed off' });
};