import { resolveUsername } from '../utils/resolve-user.js';
import { findByUsername } from '../repositories/user.js';
import {
  checkReferenceUnique,
  searchUpovCodes as searchUpovCodesRepo,
  searchTestGuidelines,
  findSourceTgForCopy,
  findSessionDeadlines,
  createTg,
  updateTg,
} from '../repositories/tg-create.repo.js';

const VALID_TWP_CODES = ['TWA', 'TWF', 'TWO', 'TWV', 'TC', 'TC-EDC'];

/**
 * GET /api/admin/test-guidelines/check-reference?ref=...
 */
export const checkReference = async (c) => {
  const ref = c.req.query('ref');
  if (!ref) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'ref is required' } }, 400);
  }
  const available = await checkReferenceUnique(ref);
  return c.json({ available });
};

/**
 * GET /api/admin/upov-codes?search=...
 */
export const searchUpovCodes = async (c) => {
  const search = c.req.query('search') || '';
  if (search.length < 2) {
    return c.json({ items: [] });
  }
  const items = await searchUpovCodesRepo(search);
  return c.json({ items });
};

/**
 * GET /api/admin/test-guidelines/search?q=...
 */
export const searchTgs = async (c) => {
  const q = c.req.query('q') || '';
  if (q.length < 2) return c.json({ items: [] });
  const items = await searchTestGuidelines(q);
  return c.json({ items });
};

/**
 * GET /api/admin/test-guidelines/:id/source
 */
export const getSourceTg = async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!id) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid ID' } }, 400);
  const data = await findSourceTgForCopy(id);
  if (!data) return c.json({ error: { code: 'NOT_FOUND', message: 'TG not found' } }, 404);
  return c.json(data);
};

/**
 * GET /api/admin/test-guidelines/deadlines?code=...&year=...
 */
export const getDeadlines = async (c) => {
  const code = c.req.query('code');
  const year = parseInt(c.req.query('year') || new Date().getFullYear(), 10);
  if (!code) return c.json({ error: { code: 'BAD_REQUEST', message: 'code is required' } }, 400);
  const deadlines = await findSessionDeadlines(code, year);
  return c.json({ deadlines });
};

/**
 * POST /api/admin/test-guidelines
 */
export const create = async (c) => {
  const username = resolveUsername(c);
  const dbUser = await findByUsername(username);
  if (!dbUser || dbUser.roleCode !== 'ADM') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, 403);
  }

  const body = await c.req.json();
  const { reference, name, upovCodeIds, techWorkParty, languageCode = 'EN', isMushroom = 'N', adminComments, sourceId, deadlines, archiveSource, isPartialRevision, targetStatus } = body;

  // Validate required fields
  if (!reference?.trim()) {
    return c.json({ error: { code: 'VALIDATION', message: 'TG Reference is required' } }, 400);
  }
  if (!name?.trim()) {
    return c.json({ error: { code: 'VALIDATION', message: 'TG Name is required' } }, 400);
  }
  if (!Array.isArray(upovCodeIds) || upovCodeIds.length === 0) {
    return c.json({ error: { code: 'VALIDATION', message: 'At least one UPOV Code is required' } }, 400);
  }
  if (!VALID_TWP_CODES.includes(techWorkParty)) {
    return c.json({ error: { code: 'VALIDATION', message: 'Valid Technical Body is required' } }, 400);
  }
  // Validate targetStatus if provided
  const VALID_TARGET_STATUSES = ['CRT', 'LED', 'TWD', 'TDD'];
  if (targetStatus && !VALID_TARGET_STATUSES.includes(targetStatus)) {
    return c.json({ error: { code: 'VALIDATION', message: 'Invalid target status' } }, 400);
  }

  // Default leDraftStart to tomorrow if not set
  const resolvedDeadlines = deadlines ? { ...deadlines } : {};
  if (!resolvedDeadlines.leDraftStart) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    resolvedDeadlines.leDraftStart = tomorrow.toISOString().slice(0, 10);
  }

  // Check reference uniqueness
  const available = await checkReferenceUnique(reference.trim());
  if (!available) {
    return c.json({ error: { code: 'DUPLICATE', message: 'TG Reference already exists' } }, 409);
  }

  const id = await createTg({
    reference: reference.trim(),
    name: name.trim(),
    techWorkParty,
    languageCode,
    isMushroom: isMushroom === 'Y' ? 'Y' : 'N',
    adminComments: adminComments?.trim() || null,
    upovCodeIds,
    sourceId: sourceId ? parseInt(sourceId, 10) : null,
    deadlines: resolvedDeadlines,
    archiveSource,
    isPartialRevision: isPartialRevision === 'Y' ? 'Y' : 'N',
    targetStatus: targetStatus || null,
  });

  return c.json({ id }, 201);
};

/**
 * PATCH /api/admin/test-guidelines/:id
 */
export const update = async (c) => {
  const username = resolveUsername(c);
  const dbUser = await findByUsername(username);
  if (!dbUser || dbUser.roleCode !== 'ADM') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, 403);
  }

  const tgId = parseInt(c.req.param('id'), 10);
  if (!tgId) return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid ID' } }, 400);

  const body = await c.req.json();
  const { reference, name, upovCodeIds, techWorkParty, languageCode = 'EN', isMushroom = 'N', adminComments, deadlines, isPartialRevision, status } = body;

  if (!reference?.trim()) return c.json({ error: { code: 'VALIDATION', message: 'TG Reference is required' } }, 400);
  if (!name?.trim()) return c.json({ error: { code: 'VALIDATION', message: 'TG Name is required' } }, 400);
  if (!Array.isArray(upovCodeIds) || upovCodeIds.length === 0) return c.json({ error: { code: 'VALIDATION', message: 'At least one UPOV Code is required' } }, 400);

  await updateTg({
    tgId,
    reference: reference.trim(),
    name: name.trim(),
    techWorkParty,
    languageCode,
    isMushroom: isMushroom === 'Y' ? 'Y' : 'N',
    adminComments: adminComments?.trim() || null,
    upovCodeIds,
    deadlines,
    isPartialRevision: isPartialRevision === 'Y' ? 'Y' : 'N',
    status: status || null,
  });

  return c.json({ id: tgId });
};
