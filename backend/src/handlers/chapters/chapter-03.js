import { 
  updateChapter03, 
  ALLOWED_FIELDS,
  createPropMethod,
  updatePropMethod,
  deletePropMethod
} from '../../repositories/chapters/chapter-03.repo.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const parseTgId = (c) => {
  const tgId = parseInt(c.req.param('id'), 10);
  return (!tgId || isNaN(tgId)) ? null : tgId;
};

const parseId = (c, name) => {
  const id = parseInt(c.req.param(name), 10);
  return (!id || isNaN(id)) ? null : id;
};

const badRequest = (c, msg) => c.json({ error: { code: 'BAD_REQUEST', message: msg } }, 400);
const notFound = (c, msg) => c.json({ error: { code: 'NOT_FOUND', message: msg } }, 404);
const serverError = (c, msg) => c.json({ error: { code: 'INTERNAL_ERROR', message: msg } }, 500);

/**
 * PATCH /api/test-guidelines/:id/chapters/03
 */
export const update = async (c) => {
  try {
    const tgId = parseTgId(c);
    if (!tgId) return badRequest(c, 'Valid test guideline ID required');

    const body = await c.req.json();
    const updates = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.includes(key)) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return badRequest(c, 'No valid fields provided');
    }

    const updated = await updateChapter03(tgId, updates);
    if (!updated) {
      return notFound(c, 'Examination data not found');
    }

    return c.json({ ok: true });
  } catch (err) {
    console.error('Chapter 03 update error:', err);
    return serverError(c, 'Failed to update chapter 03');
  }
};

// ── Propagation Methods ──────────────────────────────────────────────────────

/**
 * POST /api/test-guidelines/:id/chapters/03/propagation-methods
 */
export const createPropMethodHandler = async (c) => {
  try {
    const tgId = parseTgId(c);
    if (!tgId) return badRequest(c, 'Valid TG ID required');
    
    const body = await c.req.json();
    const result = await createPropMethod(tgId, body);
    
    if (!result) return notFound(c, 'Examination record not found');
    
    return c.json(result, 201);
  } catch (err) {
    console.error('Create propagation method error:', err);
    return serverError(c, 'Failed to create propagation method');
  }
};

/**
 * PATCH /api/test-guidelines/:id/chapters/03/propagation-methods/:pmId
 */
export const updatePropMethodHandler = async (c) => {
  try {
    const pmId = parseId(c, 'pmId');
    if (!pmId) return badRequest(c, 'Valid propagation method ID required');
    
    const body = await c.req.json();
    const updated = await updatePropMethod(pmId, body);
    
    if (!updated) return notFound(c, 'Propagation method not found');
    
    return c.json({ ok: true });
  } catch (err) {
    console.error('Update propagation method error:', err);
    return serverError(c, 'Failed to update propagation method');
  }
};

/**
 * DELETE /api/test-guidelines/:id/chapters/03/propagation-methods/:pmId
 */
export const deletePropMethodHandler = async (c) => {
  try {
    const pmId = parseId(c, 'pmId');
    if (!pmId) return badRequest(c, 'Valid propagation method ID required');
    
    const deleted = await deletePropMethod(pmId);
    
    if (!deleted) return notFound(c, 'Propagation method not found');
    
    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete propagation method error:', err);
    return serverError(c, 'Failed to delete propagation method');
  }
};
