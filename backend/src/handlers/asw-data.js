import {
  findAll,
  findById,
  findOptions,
  findUsedNames,
  update,
  create,
  remove,
} from '../repositories/asw-data.js';

/**
 * List ASW data details, optionally filtered by ASW name
 */
export const list = async (c) => {
  try {
    const aswName = c.req.query('name') || null;
    const items = await findAll(aswName);
    return c.json({ items });
  } catch (err) {
    console.error('List ASW data error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to list ASW data' } }, 500);
  }
};

/**
 * Get lookup options for filters and forms
 */
export const options = async (c) => {
  try {
    const [opts, usedNames] = await Promise.all([findOptions(), findUsedNames()]);
    return c.json({ ...opts, usedNames });
  } catch (err) {
    console.error('ASW options error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to get options' } }, 500);
  }
};

/**
 * Get a single ASW data detail
 */
export const get = async (c) => {
  try {
    const id = c.req.param('id');
    const item = await findById(id);
    if (!item) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'ASW data not found' } }, 404);
    }
    return c.json(item);
  } catch (err) {
    console.error('Get ASW data error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to get ASW data' } }, 500);
  }
};

/**
 * Update an ASW data detail
 */
export const patch = async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    await update(id, body);
    const updated = await findById(id);
    return c.json(updated);
  } catch (err) {
    console.error('Update ASW data error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to update ASW data' } }, 500);
  }
};

/**
 * Create a new ASW data detail
 */
export const post = async (c) => {
  try {
    const body = await c.req.json();
    if (!body.aswName) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'ASW name is required' } }, 400);
    }
    const id = await create(body);
    if (id === null) {
      return c.json({ error: { code: 'DUPLICATE', message: 'This combination already exists' } }, 409);
    }
    const created = await findById(id);
    return c.json(created, 201);
  } catch (err) {
    console.error('Create ASW data error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to create ASW data' } }, 500);
  }
};

/**
 * Delete an ASW data detail
 */
export const del = async (c) => {
  try {
    const id = c.req.param('id');
    const item = await findById(id);
    if (!item) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'ASW data not found' } }, 404);
    }
    await remove(id);
    return c.json({ success: true });
  } catch (err) {
    console.error('Delete ASW data error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to delete ASW data' } }, 500);
  }
};
