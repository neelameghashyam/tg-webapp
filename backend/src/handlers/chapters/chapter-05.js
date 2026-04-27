import { updateChapter05, ALLOWED_FIELDS } from '../../repositories/chapters/chapter-05.repo.js';

/**
 * PATCH /api/test-guidelines/:id/chapters/05
 */
export const update = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    if (!tgId || isNaN(tgId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } }, 400);
    }

    const body = await c.req.json();
    const updates = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.includes(key)) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'No valid fields provided' } }, 400);
    }

    const updated = await updateChapter05(tgId, updates);
    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Test guideline not found' } }, 404);
    }

    return c.json({ ok: true });
  } catch (err) {
    console.error('Chapter 05 update error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update chapter 05' } }, 500);
  }
};
