import {
  updateChapter04,
  ALLOWED_FIELDS,
  createAssessmentPropMethod,
  updateAssessmentPropMethod,
  deleteAssessmentPropMethod,
} from '../../repositories/chapters/chapter-04.repo.js';

/**
 * PATCH /api/test-guidelines/:id/chapters/04
 *
 * Handles three types of operations via the optional `_action` field in the body:
 *
 *   1. Scalar field update (no _action):
 *      { IsHybridVariety: "Y", TGCovering: "Seed", ... }
 *      → updates TG_Assessment columns
 *
 *   2. Propagation method CREATE:
 *      { _action: "pm_create", PropogationMethod: "", OtherPropogationMethodInfo: "", ... }
 *      → inserts a row into AssesmentMethodPropogation
 *      → returns the new row as { ok: true, row: {...} }
 *
 *   3. Propagation method UPDATE:
 *      { _action: "pm_update", _pmId: 4365, NumberOfPlants: "10;7", ... }
 *      → updates the matching AssesmentMethodPropogation row
 *
 *   4. Propagation method DELETE:
 *      { _action: "pm_delete", _pmId: 4365 }
 *      → deletes the matching AssesmentMethodPropogation row
 */
export const update = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    if (!tgId || isNaN(tgId))
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } }, 400);

    const body = await c.req.json();
    const { _action, _pmId, ...rest } = body;

    // ── Propagation method CREATE ──────────────────────────────────────────────
    if (_action === 'pm_create') {
      const row = await createAssessmentPropMethod(tgId, rest);
      if (!row)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Assessment record not found' } }, 404);
      return c.json({ ok: true, row });
    }

    // ── Propagation method UPDATE ──────────────────────────────────────────────
    if (_action === 'pm_update') {
      const pmId = parseInt(_pmId, 10);
      if (!pmId || isNaN(pmId))
        return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid _pmId required for pm_update' } }, 400);
      const updated = await updateAssessmentPropMethod(tgId, pmId, rest);
      if (!updated)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Propagation method not found' } }, 404);
      return c.json({ ok: true });
    }

    // ── Propagation method DELETE ──────────────────────────────────────────────
    if (_action === 'pm_delete') {
      const pmId = parseInt(_pmId, 10);
      if (!pmId || isNaN(pmId))
        return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid _pmId required for pm_delete' } }, 400);
      const deleted = await deleteAssessmentPropMethod(tgId, pmId);
      if (!deleted)
        return c.json({ error: { code: 'NOT_FOUND', message: 'Propagation method not found' } }, 404);
      return c.json({ ok: true });
    }

    // ── Scalar field update (default — no _action) ─────────────────────────────
    const updates = {};
    for (const [key, value] of Object.entries(rest)) {
      if (ALLOWED_FIELDS.includes(key)) updates[key] = value;
    }
    if (Object.keys(updates).length === 0)
      return c.json({ error: { code: 'BAD_REQUEST', message: 'No valid fields provided' } }, 400);

    const updated = await updateChapter04(tgId, updates);
    if (!updated)
      return c.json({ error: { code: 'NOT_FOUND', message: 'Assessment data not found' } }, 404);

    return c.json({ ok: true });

  } catch (err) {
    console.error('Chapter 04 update error:', err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update chapter 04' } }, 500);
  }
};