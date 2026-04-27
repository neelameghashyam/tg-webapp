import { countByTwp } from '../repositories/test-guideline.js';
import { findByUsername, countPendingRequests } from '../repositories/user.js';
import { resolveUsername } from '../utils/resolve-user.js';
import { queryOne } from '../utils/db.js';

const TWP_CODES = ['TWA', 'TWF', 'TWO', 'TWV'];
const TC_CODES  = ['TC', 'TC-EDC'];

function sum(obj) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

function filterCounts(counts, codes) {
  const result = {};
  for (const code of codes) {
    if (counts[code]) result[code] = counts[code];
  }
  return result;
}

/**
 * Get dashboard statistics — scoped to user's role and TWPs.
 *
 * Returns counts for all sidebar badge slots:
 *   twpDrafts        — TWP Projects / Drafting  (CRT+LED+IEC+LEC+LES+STU)
 *   twpDiscussion    — TWP Projects / For Discussion (TWD)
 *   tcEdcDrafting    — TC-EDC Projects / Drafting (TCD+ECC+STU)   [admin+EDC]
 *   tcEdcDiscussion  — TC-EDC Projects / For Discussion (TDD)      [admin+EDC]
 *   archived         — Archived (ARC)
 *   pendingRequests  — Users awaiting approval                     [admin]
 */
export const getStats = async (c) => {
  try {
    const username = resolveUsername(c);
    const dbUser = await findByUsername(username);
    const isAdmin = dbUser?.roleCode === 'ADM';

    const userTwpList = isAdmin
      ? TWP_CODES
      : (dbUser?.twps || '').split(',').map((t) => t.trim()).filter(Boolean);

    // Check EDC membership for sidebar visibility (non-admin)
    let isEdcMember = false;
    if (!isAdmin && dbUser?.id) {
      const edcRow = await queryOne(
        `SELECT 1
         FROM EDC_Members em
         JOIN technical_body tb ON em.TB_CodeID = tb.TB_CodeID
         WHERE em.user_id = ?
           AND tb.TB_Code IN ('TC', 'TC-EDC')
           AND YEAR(tb.date_from) = YEAR(NOW())
         LIMIT 1`,
        [dbUser.id]
      );
      isEdcMember = !!edcRow;
    }

    // Parallel fetches for all tabs needed
    const [
      twpDraftingCounts,
      twpDiscussionCounts,
      archivedCounts,
      pendingRequests,
      tcEdcDraftingCounts,
      tcEdcDiscussionCounts,
    ] = await Promise.all([
      countByTwp('twp-drafting'),
      countByTwp('twp-discussion'),
      countByTwp('archived'),
      isAdmin ? countPendingRequests() : Promise.resolve(0),
      isAdmin || isEdcMember ? countByTwp('tc-edc-drafting') : Promise.resolve({}),
      isAdmin || isEdcMember ? countByTwp('tc-edc-discussion') : Promise.resolve({}),
    ]);

    // TWP: filter to user's assigned TWPs for non-admin
    const twpDraftFiltered    = filterCounts(twpDraftingCounts,  userTwpList);
    const twpDiscussFiltered  = filterCounts(twpDiscussionCounts, userTwpList);

    // Archived: admin sees all (TWP + TC), non-admin sees only their TWPs
    const archivedVisible  = isAdmin ? [...TWP_CODES, ...TC_CODES] : userTwpList;
    const archivedFiltered = filterCounts(archivedCounts, archivedVisible);

    const stats = {
      twpDrafts:      sum(twpDraftFiltered),
      twpDiscussion:  sum(twpDiscussFiltered),
      archived:       sum(archivedFiltered),
      twpCounts: {
        twpDrafts:     twpDraftFiltered,
        twpDiscussion: twpDiscussFiltered,
        archived:      archivedFiltered,
      },
    };

    // TC-EDC counts: only for admin or EDC members
    if (isAdmin || isEdcMember) {
      const tcEdcDraftFiltered  = filterCounts(tcEdcDraftingCounts,  TC_CODES);
      const tcEdcDiscussFiltered = filterCounts(tcEdcDiscussionCounts, TC_CODES);

      stats.tcEdcDrafting    = sum(tcEdcDraftFiltered);
      stats.tcEdcDiscussion  = sum(tcEdcDiscussFiltered);
      stats.twpCounts.tcEdcDrafting    = tcEdcDraftFiltered;
      stats.twpCounts.tcEdcDiscussion  = tcEdcDiscussFiltered;
    }

    if (isAdmin) {
      stats.pendingRequests = pendingRequests;
    }

    return c.json(stats);
  } catch (err) {
    console.error('Get stats error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to get dashboard stats' } }, 500);
  }
};