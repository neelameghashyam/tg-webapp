import { updateChapter00, ALLOWED_FIELDS } from '../../repositories/chapters/chapter-00.repo.js';

/**
 * PATCH /api/test-guidelines/:id/chapters/00
 *
 * Updates cover-page fields stored directly on the TG table:
 *   - TG_Name          — Main Common Name(s)
 *   - Name_AssoDocInfo — Associated UPOV documents (rich text)
 *
 * Only the fields listed in ALLOWED_FIELDS are accepted; any others are silently ignored.
 * The route is protected by editorAuthMiddleware (LE / Admin only).
 */
export const update = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    if (!tgId || isNaN(tgId)) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } },
        400
      );
    }

    const body = await c.req.json();

    // Filter to only the permitted fields
    const updates = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.includes(key)) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: `No valid fields provided. Accepted fields: ${ALLOWED_FIELDS.join(', ')}` } },
        400
      );
    }

    const updated = await updateChapter00(tgId, updates);
    if (!updated) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Test guideline not found or already deleted' } },
        404
      );
    }

    return c.json({ ok: true });
  } catch (err) {
    console.error('Chapter 00 update error:', err);
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update cover page' } },
      500
    );
  }
};