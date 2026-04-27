import {
  findAll,
  findBodies,
  findById,
  update,
  create,
  remove,
  removeAllEdcMembers,  // Requirement 3 – needed for cascade cleanup on cancel
} from '../repositories/technical-body.js';

const NO_DEADLINE_BODIES = ['TC', 'TC-EDC'];

/**
 * Validate date sequence for the workflow timeline.
 * Returns an array of error messages (empty = valid).
 */
function validateDates(body) {
  const errors = [];
  const d = (key) => (body[key] ? new Date(body[key]) : null);

  const dateFrom        = d('dateFrom');
  const dateTo          = d('dateTo');
  const leDraftStart    = d('leDraftStart');
  const leDraftEnd      = d('leDraftEnd');
  const ieCommentsStart = d('ieCommentsStart');
  const ieCommentsEnd   = d('ieCommentsEnd');
  const leCheckingStart = d('leCheckingStart');
  const leCheckingEnd   = d('leCheckingEnd');
  const sentToUpov      = d('sentToUpov');
  const adoptionDate    = d('adoptionDate');

  // Meeting range
  if (dateFrom && dateTo && dateFrom > dateTo) {
    errors.push('Meeting start must be before end');
  }

  // Skip deadline checks for bodies without deadlines (TC / TC-EDC)
  if (NO_DEADLINE_BODIES.includes(body.code)) return errors;

  // Per-phase range checks
  if (leDraftStart    && leDraftEnd    && leDraftStart    > leDraftEnd)    errors.push('LE Draft start must be before end');
  if (ieCommentsStart && ieCommentsEnd && ieCommentsStart > ieCommentsEnd) errors.push('IE Comments start must be before end');
  if (leCheckingStart && leCheckingEnd && leCheckingStart > leCheckingEnd) errors.push('LE Checking start must be before end');
  if (sentToUpov      && adoptionDate  && sentToUpov      > adoptionDate)  errors.push('Sent to UPOV must be before Adoption Date');

  // Cross-phase ordering
  if (leDraftEnd      && ieCommentsStart && leDraftEnd      > ieCommentsStart) errors.push('LE Draft must end before IE Comments starts');
  if (ieCommentsEnd   && leCheckingStart && ieCommentsEnd   > leCheckingStart) errors.push('IE Comments must end before LE Checking starts');
  if (leCheckingEnd   && sentToUpov      && leCheckingEnd   > sentToUpov)      errors.push('LE Checking must end before Sent to UPOV');
  if (sentToUpov      && dateFrom        && sentToUpov      > dateFrom)        errors.push('Sent to UPOV must be before meeting');

  return errors;
}

// ─── list ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/technical-bodies
 * List sessions optionally filtered by ?year=YYYY.
 * Each item now includes memberCount (Requirement 1).
 */
export const list = async (c) => {
  try {
    const year  = c.req.query('year') || null;
    const items = await findAll(year);
    return c.json({ items });
  } catch (err) {
    console.error('List technical bodies error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to list technical bodies' } }, 500);
  }
};

// ─── options ──────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/technical-bodies/options
 * Return available body codes.
 */
export const options = async (c) => {
  try {
    const bodies = await findBodies();
    return c.json({ bodies });
  } catch (err) {
    console.error('Technical body options error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to get options' } }, 500);
  }
};

// ─── get ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/technical-bodies/:id
 * Fetch a single session (includes memberCount).
 */
export const get = async (c) => {
  try {
    const id   = c.req.param('id');
    const item = await findById(id);
    if (!item) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Technical body not found' } }, 404);
    }
    return c.json(item);
  } catch (err) {
    console.error('Get technical body error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to get technical body' } }, 500);
  }
};

// ─── patch ────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/technical-bodies/:id
 * Update session fields.
 */
export const patch = async (c) => {
  try {
    const id       = c.req.param('id');
    const body     = await c.req.json();
    const existing = await findById(id);
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Technical body not found' } }, 404);
    }
    const merged     = { ...existing, ...body };
    const dateErrors = validateDates(merged);
    if (dateErrors.length) {
      return c.json({ error: { code: 'VALIDATION', message: dateErrors.join('; ') } }, 400);
    }
    await update(id, body);
    const updated = await findById(id);
    return c.json(updated);
  } catch (err) {
    console.error('Update technical body error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to update technical body' } }, 500);
  }
};

// ─── post ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/technical-bodies
 * Create a new session.
 */
export const post = async (c) => {
  try {
    const body = await c.req.json();
    if (!body.code || !body.year) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Code and year are required' } }, 400);
    }
    const dateErrors = validateDates(body);
    if (dateErrors.length) {
      return c.json({ error: { code: 'VALIDATION', message: dateErrors.join('; ') } }, 400);
    }
    const id      = await create(body);
    const created = await findById(id);
    return c.json(created, 201);
  } catch (err) {
    console.error('Create technical body error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to create technical body' } }, 500);
  }
};

// ─── del ──────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/admin/technical-bodies/:id
 *
 * Requirement 2 – Cancel As Is:
 *   The overall cancel flow is unchanged: admin confirms → session is removed.
 *
 * Requirement 3 – Cancel Session On The Fly (With Members):
 *   Before deleting the session row we now explicitly remove all EDC_Members
 *   records linked to it.  This guarantees:
 *     • No FK constraint violation when the parent row is deleted.
 *     • No orphan EDC_Members rows (users who would otherwise retain phantom
 *       access to a non-existent session).
 *     • The operation is safe regardless of how many members are present
 *       (zero, one, or many) — the DELETE is a no-op when there are none.
 *
 *   The frontend already presents a member-count-aware confirmation dialog
 *   before calling this endpoint, so the user is always informed.
 */
export const del = async (c) => {
  try {
    const id   = c.req.param('id');
    const item = await findById(id);
    if (!item) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Technical body not found' } }, 404);
    }

    // Step 1 – purge EDC members (no-op if none exist)
    await removeAllEdcMembers(id);

    // Step 2 – delete the session itself
    await remove(id);

    return c.json({ success: true });
  } catch (err) {
    console.error('Delete technical body error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to delete technical body' } }, 500);
  }
};