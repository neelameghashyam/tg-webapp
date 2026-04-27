import {
  updateTq,
  createSubject,
  updateSubject,
  deleteSubject,
  createBreedingScheme,
  updateBreedingScheme,
  deleteBreedingScheme,
  createTqPropMethod,
  updateTqPropMethod,
  deleteTqPropMethod,
  createTqChar,
  deleteTqChar,
} from '../../repositories/chapters/chapter-10.repo.js';

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

// ── PATCH /api/test-guidelines/:id/chapters/10 ──────────────────────────────
export const update = async (c) => {
  try {
    const tgId = parseTgId(c);
    if (!tgId) return badRequest(c, 'Valid test guideline ID required');
    const body = await c.req.json();
    const updated = await updateTq(tgId, body);
    if (updated === null) return notFound(c, 'TQ record not found or no valid fields');
    return c.json({ ok: true });
  } catch (err) {
    console.error('Update TQ error:', err);
    return serverError(c, 'Failed to update TQ');
  }
};

// ── Subjects ─────────────────────────────────────────────────────────────────
export const createSubjectHandler = async (c) => {
  try {
    const tgId = parseTgId(c);
    if (!tgId) return badRequest(c, 'Valid TG ID required');
    const body = await c.req.json();
    const result = await createSubject(tgId, body);
    if (!result) return notFound(c, 'TQ not found');
    return c.json(result, 201);
  } catch (err) {
    console.error('Create TQ subject error:', err);
    return serverError(c, 'Failed to create subject');
  }
};

export const updateSubjectHandler = async (c) => {
  try {
    const sId = parseId(c, 'sId');
    if (!sId) return badRequest(c, 'Valid subject ID required');
    const body = await c.req.json();
    const updated = await updateSubject(sId, body);
    if (!updated) return notFound(c, 'Subject not found');
    return c.json({ ok: true });
  } catch (err) {
    console.error('Update TQ subject error:', err);
    return serverError(c, 'Failed to update subject');
  }
};

export const removeSubjectHandler = async (c) => {
  try {
    const sId = parseId(c, 'sId');
    if (!sId) return badRequest(c, 'Valid subject ID required');
    const deleted = await deleteSubject(sId);
    if (!deleted) return notFound(c, 'Subject not found');
    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete TQ subject error:', err);
    return serverError(c, 'Failed to delete subject');
  }
};

// ── Breeding Schemes ─────────────────────────────────────────────────────────
export const createBsHandler = async (c) => {
  try {
    const tgId = parseTgId(c);
    if (!tgId) return badRequest(c, 'Valid TG ID required');
    const body = await c.req.json();
    const result = await createBreedingScheme(tgId, body);
    if (!result) return notFound(c, 'TQ not found');
    return c.json(result, 201);
  } catch (err) {
    console.error('Create breeding scheme error:', err);
    return serverError(c, 'Failed to create breeding scheme');
  }
};

export const updateBsHandler = async (c) => {
  try {
    const bsId = parseId(c, 'bsId');
    if (!bsId) return badRequest(c, 'Valid breeding scheme ID required');
    const body = await c.req.json();
    const updated = await updateBreedingScheme(bsId, body);
    if (!updated) return notFound(c, 'Breeding scheme not found');
    return c.json({ ok: true });
  } catch (err) {
    console.error('Update breeding scheme error:', err);
    return serverError(c, 'Failed to update breeding scheme');
  }
};

export const removeBsHandler = async (c) => {
  try {
    const bsId = parseId(c, 'bsId');
    if (!bsId) return badRequest(c, 'Valid breeding scheme ID required');
    const deleted = await deleteBreedingScheme(bsId);
    if (!deleted) return notFound(c, 'Breeding scheme not found');
    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete breeding scheme error:', err);
    return serverError(c, 'Failed to delete breeding scheme');
  }
};

// ── Propagation Methods ──────────────────────────────────────────────────────
export const createPmHandler = async (c) => {
  try {
    const tgId = parseTgId(c);
    if (!tgId) return badRequest(c, 'Valid TG ID required');
    const body = await c.req.json();
    const result = await createTqPropMethod(tgId, body);
    if (!result) return notFound(c, 'TQ not found');
    return c.json(result, 201);
  } catch (err) {
    console.error('Create TQ prop method error:', err);
    return serverError(c, 'Failed to create propagation method');
  }
};

export const updatePmHandler = async (c) => {
  try {
    const pmId = parseId(c, 'pmId');
    if (!pmId) return badRequest(c, 'Valid propagation method ID required');
    const body = await c.req.json();
    const updated = await updateTqPropMethod(pmId, body);
    if (!updated) return notFound(c, 'Propagation method not found');
    return c.json({ ok: true });
  } catch (err) {
    console.error('Update TQ prop method error:', err);
    return serverError(c, 'Failed to update propagation method');
  }
};

export const removePmHandler = async (c) => {
  try {
    const pmId = parseId(c, 'pmId');
    if (!pmId) return badRequest(c, 'Valid propagation method ID required');
    const deleted = await deleteTqPropMethod(pmId);
    if (!deleted) return notFound(c, 'Propagation method not found');
    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete TQ prop method error:', err);
    return serverError(c, 'Failed to delete propagation method');
  }
};

// ── TQ Characteristics ───────────────────────────────────────────────────────
export const createCharHandler = async (c) => {
  try {
    const tgId = parseTgId(c);
    if (!tgId) return badRequest(c, 'Valid TG ID required');
    const body = await c.req.json();
    const result = await createTqChar(tgId, body);
    if (!result) return notFound(c, 'TQ not found');
    return c.json(result, 201);
  } catch (err) {
    console.error('Create TQ characteristic error:', err);
    return serverError(c, 'Failed to create TQ characteristic');
  }
};

export const removeCharHandler = async (c) => {
  try {
    const charId = parseId(c, 'charId');
    if (!charId) return badRequest(c, 'Valid characteristic ID required');
    const deleted = await deleteTqChar(charId);
    if (!deleted) return notFound(c, 'TQ characteristic not found');
    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete TQ characteristic error:', err);
    return serverError(c, 'Failed to delete TQ characteristic');
  }
};
