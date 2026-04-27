import {
  createParagraph,
  updateParagraph,
  deleteParagraph,
} from '../../repositories/chapters/paragraphs.repo.js';

/**
 * POST /api/test-guidelines/:id/paragraphs
 */
export const create = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    if (!tgId || isNaN(tgId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } }, 400);
    }

    const body = await c.req.json();
    const paragraph = await createParagraph(tgId, body.Sub_Add_Info || '');

    return c.json(paragraph, 201);
  } catch (err) {
    console.error('Create paragraph error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create paragraph' } }, 500);
  }
};

/**
 * PATCH /api/test-guidelines/:id/paragraphs/:pId
 */
export const update = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    const pId = parseInt(c.req.param('pId'), 10);
    if (!tgId || isNaN(tgId) || !pId || isNaN(pId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid IDs required' } }, 400);
    }

    const body = await c.req.json();
    if (body.Sub_Add_Info === undefined) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Sub_Add_Info is required' } }, 400);
    }

    const updated = await updateParagraph(pId, body.Sub_Add_Info);
    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Paragraph not found' } }, 404);
    }

    return c.json({ ok: true });
  } catch (err) {
    console.error('Update paragraph error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update paragraph' } }, 500);
  }
};

/**
 * DELETE /api/test-guidelines/:id/paragraphs/:pId
 */
export const remove = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    const pId = parseInt(c.req.param('pId'), 10);
    if (!tgId || isNaN(tgId) || !pId || isNaN(pId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid IDs required' } }, 400);
    }

    const deleted = await deleteParagraph(tgId, pId);
    if (!deleted) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Cannot delete this paragraph' } }, 400);
    }

    return c.json({ ok: true });
  } catch (err) {
    console.error('Delete paragraph error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete paragraph' } }, 500);
  }
};
