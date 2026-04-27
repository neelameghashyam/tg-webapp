import {
  createCharacteristic,
  updateCharacteristic,
  deleteCharacteristic,
  reorderCharacteristics,
  createExpression,
  updateExpression,
  deleteExpression,
  searchAdopted,
} from '../../repositories/chapters/chapter-07.repo.js';
import { findCharacteristics } from '../../repositories/chapters/edit.repo.js';

/**
 * GET /api/test-guidelines/:id/characteristics
 */
export const list = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    if (!tgId || isNaN(tgId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } }, 400);
    }
    const chars = await findCharacteristics(tgId);
    return c.json(chars);
  } catch (err) {
    console.error('List characteristics error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list characteristics' } }, 500);
  }
};

/**
 * POST /api/test-guidelines/:id/characteristics
 */
export const create = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    if (!tgId || isNaN(tgId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } }, 400);
    }
    const body = await c.req.json();
    const char = await createCharacteristic(tgId, body);
    return c.json(char, 201);
  } catch (err) {
    console.error('Create characteristic error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create characteristic' } }, 500);
  }
};

/**
 * PATCH /api/test-guidelines/:id/characteristics/:charId
 */
export const update = async (c) => {
  try {
    const charId = parseInt(c.req.param('charId'), 10);
    if (!charId || isNaN(charId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid characteristic ID required' } }, 400);
    }
    const body = await c.req.json();
    const updated = await updateCharacteristic(charId, body);
    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Characteristic not found' } }, 404);
    }
    return c.json({ ok: true });
  } catch (err) {
    console.error('Update characteristic error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update characteristic' } }, 500);
  }
};

/**
 * DELETE /api/test-guidelines/:id/characteristics/:charId
 */
export const remove = async (c) => {
  try {
    const charId = parseInt(c.req.param('charId'), 10);
    if (!charId || isNaN(charId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid characteristic ID required' } }, 400);
    }
    const deleted = await deleteCharacteristic(charId);
    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Characteristic not found' } }, 404);
    }
    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete characteristic error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete characteristic' } }, 500);
  }
};

/**
 * PUT /api/test-guidelines/:id/characteristics/reorder
 */
export const reorder = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    if (!tgId || isNaN(tgId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } }, 400);
    }
    const body = await c.req.json();
    if (!Array.isArray(body.order)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'order array is required' } }, 400);
    }
    await reorderCharacteristics(tgId, body.order);
    return c.json({ ok: true });
  } catch (err) {
    console.error('Reorder characteristics error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder characteristics' } }, 500);
  }
};

/**
 * POST /api/test-guidelines/:id/characteristics/:charId/expressions
 */
export const createExpr = async (c) => {
  try {
    const charId = parseInt(c.req.param('charId'), 10);
    if (!charId || isNaN(charId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid characteristic ID required' } }, 400);
    }
    const body = await c.req.json();
    const expr = await createExpression(charId, body);
    return c.json(expr, 201);
  } catch (err) {
    console.error('Create expression error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create expression' } }, 500);
  }
};

/**
 * PATCH /api/test-guidelines/:id/characteristics/:charId/expressions/:exprId
 */
export const updateExpr = async (c) => {
  try {
    const exprId = parseInt(c.req.param('exprId'), 10);
    if (!exprId || isNaN(exprId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid expression ID required' } }, 400);
    }
    const body = await c.req.json();
    const updated = await updateExpression(exprId, body);
    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expression not found' } }, 404);
    }
    return c.json({ ok: true });
  } catch (err) {
    console.error('Update expression error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update expression' } }, 500);
  }
};

/**
 * DELETE /api/test-guidelines/:id/characteristics/:charId/expressions/:exprId
 */
export const removeExpr = async (c) => {
  try {
    const exprId = parseInt(c.req.param('exprId'), 10);
    if (!exprId || isNaN(exprId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid expression ID required' } }, 400);
    }
    const deleted = await deleteExpression(exprId);
    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Expression not found' } }, 404);
    }
    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete expression error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete expression' } }, 500);
  }
};

/**
 * GET /api/test-guidelines/:id/characteristics/search-adopted
 */
export const searchAdoptedHandler = async (c) => {
  try {
    const q = c.req.query('q') || '';
    const limit = parseInt(c.req.query('limit') || '20', 10);
    if (!q.trim()) {
      return c.json([]);
    }
    const results = await searchAdopted(q, limit);
    return c.json(results);
  } catch (err) {
    console.error('Search adopted error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to search adopted characteristics' } }, 500);
  }
};
