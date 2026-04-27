import {
  findAllUsers,
  findUserById,
  updateUserRole,
  deleteUser,
  countUserTgAssignments,
  countByRole,
} from '../repositories/user.js';

const VALID_ROLES = ['ADM', 'EXP', 'TRN'];

/**
 * Get user counts by role
 */
export const userCounts = async (c) => {
  try {
    const counts = await countByRole();
    return c.json({ counts });
  } catch (err) {
    console.error('User counts error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to get user counts' } }, 500);
  }
};

/**
 * List active users with server-side search, sort, and pagination.
 * Query params: role, search, sort, order, page, limit
 */
export const listUsers = async (c) => {
  try {
    const role = c.req.query('role') || undefined;
    const search = c.req.query('search') || undefined;
    const sort = c.req.query('sort') || undefined;
    const order = c.req.query('order') || undefined;
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const { items, total } = await findAllUsers({ role, search, sort, order, page, limit });
    return c.json({ items, meta: { page, limit, total } });
  } catch (err) {
    console.error('List users error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to list users' } }, 500);
  }
};

/**
 * Get a single user by ID
 */
export const getUser = async (c) => {
  try {
    const id = c.req.param('id');
    const user = await findUserById(id);
    if (!user) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    return c.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to get user' } }, 500);
  }
};

/**
 * Update a user's role
 */
export const updateRole = async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { roleCode } = body;

    if (!roleCode || !VALID_ROLES.includes(roleCode)) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: `Role must be one of: ${VALID_ROLES.join(', ')}` } },
        400
      );
    }

    const user = await findUserById(id);
    if (!user) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }

    await updateUserRole(id, roleCode);
    return c.json({ message: 'Role updated' });
  } catch (err) {
    console.error('Update role error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to update role' } }, 500);
  }
};

/**
 * Delete a user (409 if assigned to TGs)
 */
export const deleteUserHandler = async (c) => {
  try {
    const id = c.req.param('id');

    const user = await findUserById(id);
    if (!user) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }

    const tgCount = await countUserTgAssignments(id);
    if (tgCount > 0) {
      return c.json(
        { error: { code: 'CONFLICT', message: `Cannot delete user assigned as Leading Expert to ${tgCount} test guideline(s). Remove LE assignments first.` } },
        409
      );
    }

    await deleteUser(id);
    return c.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to delete user' } }, 500);
  }
};
