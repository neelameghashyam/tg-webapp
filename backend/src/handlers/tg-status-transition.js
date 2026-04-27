import { resolveUsername } from '../utils/resolve-user.js';
import { findByUsername } from '../repositories/user.js';
import { queryOne, getPool } from '../utils/db.js';

/**
 * Allowed admin status transitions.
 * Key = current status, value = array of allowed target statuses.
 */
const ALLOWED_TRANSITIONS = {
  CRT: ['LED'],
  LED: ['IEC', 'TCD'],
  IEC: ['LEC', 'TCD'],
  LEC: ['LES', 'STU', 'TCD'],
  LES: ['TCD'],
  STU: ['TCD'],
  TWD: ['TCD'],
  TCD: ['IEC', 'TDD'],
  TDD: ['ADT', 'ADC', 'TCD'],
  ADT: ['ARC'],
  ADC: ['ARC'],
};

/**
 * PATCH /api/admin/test-guidelines/:id/status
 * Admin transitions a TG to a new status.
 */
export const transitionStatus = async (c) => {
  const username = resolveUsername(c);
  const dbUser = await findByUsername(username);
  if (!dbUser || dbUser.roleCode !== 'ADM') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, 403);
  }

  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TG ID' } }, 400);

  const body = await c.req.json();
  const { status: targetStatus, techWorkParty } = body;

  if (!targetStatus) {
    return c.json({ error: { code: 'VALIDATION', message: 'Target status is required' } }, 400);
  }

  // Get current TG
  const tg = await queryOne('SELECT TG_ID, Status_Code, CPI_TechWorkParty FROM TG WHERE TG_ID = ?', [tgId]);
  if (!tg) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Test guideline not found' } }, 404);
  }

  // Validate transition
  const allowed = ALLOWED_TRANSITIONS[tg.Status_Code] || [];
  if (!allowed.includes(targetStatus)) {
    return c.json({
      error: {
        code: 'INVALID_TRANSITION',
        message: `Cannot transition from ${tg.Status_Code} to ${targetStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      },
    }, 409);
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const updates = ['Status_Code = ?', 'TG_LastUpdated = NOW()'];
    const params = [targetStatus];

    // On promote to TCD: update technical body if provided
    if (targetStatus === 'TCD' && techWorkParty) {
      updates.push('CPI_TechWorkParty = ?');
      params.push(techWorkParty);
    }

    params.push(tgId);
    await conn.execute(`UPDATE TG SET ${updates.join(', ')} WHERE TG_ID = ?`, params);

    // Log transition — wrapped in try/catch so column mismatch never aborts the transition
    try {
      await conn.execute(
        `INSERT INTO tg_history_log (TG_ID, Status_Code, UserID, Modification_Time, Comments)
         VALUES (?, ?, ?, NOW(), ?)`,
        [tgId, targetStatus, dbUser.id, `Admin transition: ${tg.Status_Code} → ${targetStatus}`]
      );
    } catch (logErr) {
      console.warn('[tg-status-transition] log failed:', logErr.message);
    }

    // On LEC → LES (admin sign-off): deactivate IEs
    if (tg.Status_Code === 'LEC' && targetStatus === 'LES') {
      await conn.execute(
        "UPDATE Tg_Users SET Status_Code = 'I' WHERE TG_ID = ? AND Role_Code = 'IE'",
        [tgId]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return c.json({ id: tgId, status: targetStatus });
};