import { findAll, countAll, findById, findUsersByTgId, countIeComments, findIeComments } from '../repositories/test-guideline.js';
import { findByUsername } from '../repositories/user.js';
import { resolveUsername } from '../utils/resolve-user.js';

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&times;/g, '\u00d7').replace(/&amp;/g, '&').trim();
}

/**
 * Tabs accessible by non-admin users.
 * tc-edc-* tabs require admin or EDC member — enforced below.
 */
const PUBLIC_TABS = ['twp-drafting', 'twp-discussion', 'archived'];
/** Legacy tab names still accepted during FE migration */
const LEGACY_PUBLIC_TABS = ['twp-drafts', 'archived'];

/**
 * GET /api/test-guidelines
 */
export const list = async (c) => {
  try {
    const tab = c.req.query('tab');
    const status = c.req.query('status');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '0', 10) || null;
    const offset = limit ? (page - 1) * limit : 0;
    const sortDir = c.req.query('order') || c.req.query('sortDir') || null;

    const username = resolveUsername(c);
    const dbUser = await findByUsername(username);
    const isAdmin = dbUser?.roleCode === 'ADM';

    // Non-admins can only access TWP + archived tabs.
    // TC-EDC tabs also allow EDC members — checked separately below.
    const isTcEdcTab = ['tc-edc-drafting', 'tc-edc-discussion'].includes(tab);
    const isPublicTab = PUBLIC_TABS.includes(tab) || LEGACY_PUBLIC_TABS.includes(tab);

    if (!isAdmin && isTcEdcTab) {
      // Check EDC membership for any session
      const { queryOne } = await import('../utils/db.js');
      const edcRow = await queryOne(
        'SELECT 1 FROM EDC_Members WHERE user_id = ? LIMIT 1',
        [dbUser?.userId]
      );
      if (!edcRow) {
        return c.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
      }
    } else if (!isAdmin && !isPublicTab) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    }

    const filters = {};
    const search = c.req.query('search');
    if (search) filters.search = search;
    const twp = c.req.query('twp');
    if (twp) filters.twp = twp;
    const statusFilter = c.req.query('status_filter');
    if (statusFilter) filters.status = statusFilter;
    for (const key of ['name', 'reference', 'leadExpert', 'upovCodes', 'status', 'twps']) {
      const val = c.req.query(`filter[${key}]`);
      if (val) filters[key] = val;
    }

    // Non-admin users only see TGs matching their TWPs (TWP pipeline tabs)
    const userTwps = isAdmin || isTcEdcTab ? null : (dbUser?.twps || null);

    const [items, total] = await Promise.all([
      findAll({ tab, status, limit, offset, filters, sortDir, userTwps, isAdmin }),
      countAll(tab, filters, userTwps, isAdmin),
    ]);

    for (const item of items) {
      item.upovCodes = item.upovCodes
        ? item.upovCodes.split('||').map(stripHtml)
        : [];
    }

    if (limit) {
      return c.json({ items, meta: { page, limit, total } });
    }
    return c.json({ items, total, limit, offset });
  } catch (err) {
    console.error('List TGs error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to list test guidelines' } }, 500);
  }
};

/**
 * GET /api/test-guidelines/:id
 */
export const get = async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Test guideline ID required' } }, 400);
    }

    const tg = await findById(id);
    if (!tg) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Test guideline not found' } }, 404);
    }

    tg.upovCodes = tg.upovCodes ? tg.upovCodes.split('||').map(stripHtml) : [];

    const [users, ieCommentCount] = await Promise.all([
      findUsersByTgId(id),
      countIeComments(id),
    ]);

    return c.json({ ...tg, users, ieCommentCount });
  } catch (err) {
    console.error('Get TG error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to get test guideline' } }, 500);
  }
};

/**
 * GET /api/test-guidelines/:id/ie-comments
 */
export const getIeComments = async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Test guideline ID required' } }, 400);
    }
    const comments = await findIeComments(id);
    for (const comment of comments) {
      if (comment.chapterName) comment.chapterName = stripHtml(comment.chapterName);
      if (comment.sectionName) comment.sectionName = stripHtml(comment.sectionName);
    }
    return c.json(comments);
  } catch (err) {
    console.error('Get IE comments error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to get IE comments' } }, 500);
  }
};