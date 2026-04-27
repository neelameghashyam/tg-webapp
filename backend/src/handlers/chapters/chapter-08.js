import {
  createExplanation,
  updateExplanation,
  deleteExplanation,
} from '../../repositories/chapters/chapter-08.repo.js';

/**
 * POST /api/test-guidelines/:id/chapters/08/explanations
 */
export const create = async (c) => {
  try {
    const body = await c.req.json();
    if (!body.TOC_ID) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'TOC_ID is required' } }, 400);
    }
    const result = await createExplanation(body);
    return c.json(result, 201);
  } catch (err) {
    console.error('Create explanation error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create explanation' } }, 500);
  }
};

/**
 * PATCH /api/test-guidelines/:id/chapters/08/explanations/:explId
 */
export const update = async (c) => {
  try {
    const explId = parseInt(c.req.param('explId'), 10);
    if (!explId || isNaN(explId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid explanation ID required' } }, 400);
    }
    const body = await c.req.json();
    const updated = await updateExplanation(explId, body);
    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Explanation not found' } }, 404);
    }
    return c.json({ ok: true });
  } catch (err) {
    console.error('Update explanation error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update explanation' } }, 500);
  }
};

/**
 * DELETE /api/test-guidelines/:id/chapters/08/explanations/:explId
 */
export const remove = async (c) => {
  try {
    const explId = parseInt(c.req.param('explId'), 10);
    if (!explId || isNaN(explId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid explanation ID required' } }, 400);
    }
    const deleted = await deleteExplanation(explId);
    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Explanation not found' } }, 404);
    }
    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete explanation error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete explanation' } }, 500);
  }
};
