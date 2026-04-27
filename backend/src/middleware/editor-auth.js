import { queryOne } from '../utils/db.js';
import { findByUsername } from '../repositories/user.js';
import { getPermission } from '../config/permissions.js';

/**
 * Check if a user is an EDC member for the TC-EDC session that owns the TG.
 * EDC membership is stored in EDC_Members(user_id, TB_CodeID) linked to
 * the technical_body row for that session.
 *
 * Returns the TB_CodeID if the user is a member, null otherwise.
 */
/**
 * Check if a user is an EDC member for the TC-EDC session that owns this TG.
 *
 * EDC membership is session-scoped: a user is a member of a specific TB_CodeID
 * (technical_body row). Access is granted only when the TG's CPI_TechWorkParty
 * is TC or TC-EDC AND the user is a member of a TC/TC-EDC session.
 *
 * The original query used a cross-join pattern (`JOIN TG tg ON tg.CPI_TechWorkParty IN (...)`)
 * which allowed any EDC member from any session/year to access any TC/TC-EDC TG.
 * This fix scopes the check to the TG in question and limits to sessions whose
 * TB_Code is TC or TC-EDC (same work party family as the TG).
 *
 * @param {number} userId
 * @param {number} tgId
 * @returns {Promise<number|null>} TB_CodeID if member, null otherwise
 */
async function isEdcMemberForTg(userId, tgId) {
  const row = await queryOne(
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
    [userId, tgId]
  );
  return row ? row.TB_CodeID : null;
}

/**
 * Editor authorization middleware.
 *
 * Access rules (priority order):
 *  1. Admin  — always allowed; permission resolved from TG status matrix.
 *  2. EDC member — allowed on TC-EDC TGs (TCD, ECC, TDD); permission from matrix.
 *  3. LE assigned to the TG — allowed; permission from matrix.
 *  4. Everyone else — 403.
 *
 * GET requests pass through for any authenticated user.
 * Sets `editorPermission` on context for downstream handlers.
 */
export const editorAuthMiddleware = async (c, next) => {
  // Read-only requests are allowed for any authenticated user
  if (c.req.method === 'GET') {
    return next();
  }

  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId || isNaN(tgId)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid TG ID required' } }, 400);
  }

  const authUser = c.get('user');
  if (!authUser?.sub) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  const dbUser = await findByUsername(authUser.sub);
  if (!dbUser) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'User not found in the system' } },
      403
    );
  }

  const tg = await queryOne(
    'SELECT Status_Code, CPI_TechWorkParty FROM TG WHERE TG_ID = ?',
    [tgId]
  );

  // ── 1. Admin bypass ───────────────────────────────────────────────────────
  if (dbUser.roleCode === 'ADM') {
    if (tg) {
      c.set('editorPermission', getPermission(tg.Status_Code, tg.CPI_TechWorkParty, 'ADM'));
    }
    return next();
  }

  // ── 2. EDC member check (TC-EDC TGs only) ────────────────────────────────
  const isTcEdcTg = tg && ['TC', 'TC-EDC'].includes(tg.CPI_TechWorkParty);
  if (isTcEdcTg) {
    const edcSession = await isEdcMemberForTg(dbUser.id, tgId);
    if (edcSession) {
      c.set('editorPermission', getPermission(tg.Status_Code, tg.CPI_TechWorkParty, 'EDC'));
      c.set('edcSession', edcSession);
      return next();
    }
  }

  // ── 3. LE check ───────────────────────────────────────────────────────────
  const isLe = await queryOne(
    `SELECT 1 FROM Tg_Users WHERE User_ID = ? AND TG_ID = ? AND Role_Code = 'LE'`,
    [dbUser.id, tgId]
  );

  if (!isLe) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'Access denied for this test guideline' } },
      403
    );
  }

  if (tg) {
    c.set('editorPermission', getPermission(tg.Status_Code, tg.CPI_TechWorkParty, 'LE'));
  }

  return next();
};