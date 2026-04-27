import {
  findByUsername,
  findUserById,
  createAccessRequest,
  updateAccessRequest,
  findByRequestStatus,
  approveUser,
  rejectUser,
  findAllOffices,
  syncIeAssignments,
} from '../repositories/user.js';
import { getProvider } from '../utils/oauth-providers.js';

/**
 * Submit an access request (create or update user record)
 */
export const submit = async (c) => {
  try {
    const authUser = c.get('user');
    const providerName = c.get('authProvider') || 'forgerock';
    const provider = getProvider(providerName);
    const identity = provider.getUserIdentity(authUser);
    const username = identity.username;
    const body = await c.req.json();
    const { officeCode, twps } = body;

    if (!officeCode || !twps) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Office and TWPs are required' } }, 400);
    }

    // Full name and email come from SSO identity, not user input
    const fullName = identity.name || username;
    const email = identity.email || '';

    const existingUser = await findByUsername(username);

    if (existingUser) {
      // Re-submit (e.g. after rejection)
      await updateAccessRequest(existingUser.id, { officeCode, twps });
    } else {
      // New user
      await createAccessRequest({ userName: username, fullName, email, officeCode, twps });
    }

    return c.json({ message: 'Access request submitted' });
  } catch (err) {
    console.error('Submit access request error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to submit access request' } }, 500);
  }
};

/**
 * List pending access requests (admin)
 */
export const listPending = async (c) => {
  try {
    const users = await findByRequestStatus('Pending');
    return c.json({ items: users });
  } catch (err) {
    console.error('List pending requests error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to list pending requests' } }, 500);
  }
};

/**
 * Approve an access request (admin)
 */
export const approve = async (c) => {
  try {
    const id = c.req.param('id');
    await approveUser(id);

    // Auto-assign EXP users as IE to TGs matching their TWPs
    const user = await findUserById(id);
    if (user && user.roleCode === 'EXP' && user.twps) {
      const { assigned } = await syncIeAssignments(id, user.twps);
      console.log(`Auto-assigned user ${id} as IE to ${assigned} TG(s)`);
    }

    return c.json({ message: 'User approved' });
  } catch (err) {
    console.error('Approve user error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to approve user' } }, 500);
  }
};

/**
 * Reject an access request (admin)
 */
export const reject = async (c) => {
  try {
    const id = c.req.param('id');
    await rejectUser(id);
    return c.json({ message: 'User rejected' });
  } catch (err) {
    console.error('Reject user error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to reject user' } }, 500);
  }
};

/**
 * List all offices for autocomplete
 */
export const offices = async (c) => {
  try {
    const items = await findAllOffices();
    return c.json({ items });
  } catch (err) {
    console.error('List offices error:', err);
    return c.json({ error: { code: 'ERROR', message: 'Failed to list offices' } }, 500);
  }
};
