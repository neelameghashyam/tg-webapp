import { findByUsername, updateTwps, syncIeAssignments, findLeTwps } from '../repositories/user.js';
import { resolveUsername } from '../utils/resolve-user.js';

const VALID_TWPS = ['TWA', 'TWF', 'TWO', 'TWV'];

/**
 * Update current user's TWPs and re-assign IE TGs
 */
export const updateMyTwps = async (c) => {
  try {
    const body = await c.req.json();
    const { twps } = body;

    if (!twps || typeof twps !== 'string') {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'TWPs are required' } }, 400);
    }

    const twpList = twps.split(',').map((t) => t.trim()).filter(Boolean);
    if (twpList.length === 0 || !twpList.every((t) => VALID_TWPS.includes(t))) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid TWP value' } }, 400);
    }

    // Resolve current user
    const username = resolveUsername(c);

    const dbUser = await findByUsername(username);
    if (!dbUser) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }

    // Check if user is removing a TWP where they are LE
    const leTwps = await findLeTwps(dbUser.id);
    const removedLeTwps = leTwps.filter((t) => !twpList.includes(t));
    if (removedLeTwps.length > 0) {
      return c.json({
        error: {
          code: 'LE_CONFLICT',
          message: `Cannot remove ${removedLeTwps.join(', ')} — you are assigned as Leading Expert in TGs under ${removedLeTwps.length === 1 ? 'this TWP' : 'these TWPs'}`,
        },
      }, 400);
    }

    const normalizedTwps = twpList.join(',');
    await updateTwps(dbUser.id, normalizedTwps);

    // Sync IE assignments: add matching, remove non-matching
    const { assigned, removed } = await syncIeAssignments(dbUser.id, normalizedTwps);
    console.log(`Profile TWP update: user ${dbUser.id} → ${normalizedTwps}, assigned ${assigned}, removed ${removed}`);

    return c.json({ message: 'TWPs updated', twps: normalizedTwps, assigned, removed });
  } catch (err) {
    console.error('Update TWPs error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to update TWPs' } }, 500);
  }
};
