import { 
  updateChapter05, 
  fetchGroupingCharacteristics,
  fetchGroupingSummary,
  saveGroupingTexts,
  ALLOWED_FIELDS 
} from '../../repositories/chapters/chapter-05.repo.js';

/**
 * GET /api/test-guidelines/:id/chapters/05
 * Fetch chapter 05 data including grouping characteristics
 */
export const get = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    const languageCode = c.req.query('languageCode') || 'EN';

    if (!tgId || isNaN(tgId)) {
      return c.json({ 
        error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } 
      }, 400);
    }

    const [characteristics, groupingSummaryText] = await Promise.all([
      fetchGroupingCharacteristics(tgId, languageCode),
      fetchGroupingSummary(tgId, languageCode)
    ]);

    return c.json({
      characteristics,
      groupingSummaryText
    });
  } catch (err) {
    console.error('Chapter 05 fetch error:', err);
    return c.json({ 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch chapter 05' } 
    }, 500);
  }
};

/**
 * PATCH /api/test-guidelines/:id/chapters/05
 * Update grouping summary or individual characteristic grouping texts
 */
export const update = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);

    if (!tgId || isNaN(tgId)) {
      return c.json({ 
        error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } 
      }, 400);
    }

    const body = await c.req.json();

    // Handle bulk grouping text updates
    if (body.groupingData && Array.isArray(body.groupingData)) {
      const languageCode = body.languageCode || 'EN';
      const userRole = body.userRole || 'DRF';

      const results = await saveGroupingTexts(
        tgId, 
        body.groupingData, 
        languageCode, 
        userRole
      );

      return c.json({ ok: true, results });
    }

    // Handle simple field updates (backwards compatibility)
    const updates = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.includes(key)) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ 
        error: { code: 'BAD_REQUEST', message: 'No valid fields provided' } 
      }, 400);
    }

    const updated = await updateChapter05(tgId, updates);

    if (!updated) {
      return c.json({ 
        error: { code: 'NOT_FOUND', message: 'Test guideline not found' } 
      }, 404);
    }

    return c.json({ ok: true });
  } catch (err) {
    console.error('Chapter 05 update error:', err);
    return c.json({ 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update chapter 05' } 
    }, 500);
  }
};