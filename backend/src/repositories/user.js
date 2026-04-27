import { query, queryOne } from '../utils/db.js';

/**
 * Find user by username (case-insensitive)
 */
export const findByUsername = async (username) => {
  return queryOne(
    `SELECT
      up.User_ID as id,
      up.User_Name as userName,
      up.Full_Name as fullName,
      up.PrimaryEmail as email,
      up.Role_Code as roleCode,
      up.Status_Code as statusCode,
      up.Request_Status as requestStatus,
      up.Office_Code as officeCode,
      up.TWPS as twps
    FROM User_Profile up
    WHERE UPPER(up.User_Name) = UPPER(?)`,
    [username]
  );
};

/**
 * Create a new access request (insert user with Pending status)
 * Full_Name and PrimaryEmail come from SSO identity, PrimaryPhone defaults to '-'
 */
export const createAccessRequest = async ({ userName, fullName, email, officeCode, twps }) => {
  const result = await query(
    `INSERT INTO User_Profile (User_Name, Full_Name, PrimaryEmail, PrimaryPhone, Office_Code, TWPS, Role_Code, Status_Code, Request_Status, User_lastupdated, Created_Time)
     VALUES (?, ?, ?, '-', ?, ?, 'EXP', 'I', 'Pending', NOW(), NOW())`,
    [userName, fullName, email, officeCode, twps]
  );
  return result;
};

/**
 * Auto-provision an EntraID user (active admin with all TWPs)
 */
export const createEntraIdUser = async ({ userName, fullName, email }) => {
  const result = await query(
    `INSERT INTO User_Profile (User_Name, Full_Name, PrimaryEmail, PrimaryPhone, Office_Code, TWPS, Role_Code, Status_Code, Request_Status, User_lastupdated, Created_Time)
     VALUES (?, ?, ?, '-', 'UPOV', NULL, 'ADM', 'A', 'Accepted', NOW(), NOW())`,
    [userName, fullName, email]
  );
  return result;
};

/**
 * Update an existing access request (re-submit after rejection)
 */
export const updateAccessRequest = async (userId, { officeCode, twps }) => {
  return query(
    `UPDATE User_Profile
     SET Office_Code = ?, TWPS = ?, Request_Status = 'Pending'
     WHERE User_ID = ?`,
    [officeCode, twps, userId]
  );
};

/**
 * Sync SSO identity fields (Full_Name, PrimaryEmail) on every login
 */
export const syncUserIdentity = async (userId, { fullName, email }) => {
  return query(
    `UPDATE User_Profile
     SET Full_Name = ?, PrimaryEmail = ?, User_lastupdated = NOW()
     WHERE User_ID = ?`,
    [fullName, email, userId]
  );
};

/**
 * Find users by request status (e.g. 'Pending')
 */
export const findByRequestStatus = async (status) => {
  return query(
    `SELECT
      up.User_ID as id,
      up.User_Name as userName,
      up.Full_Name as fullName,
      up.PrimaryEmail as email,
      up.Office_Code as officeCode,
      up.TWPS as twps,
      up.Request_Status as requestStatus,
      o.Office_Name as officeName
    FROM User_Profile up
    LEFT JOIN Office o ON up.Office_Code = o.Office_Code
    WHERE up.Request_Status = ?
    ORDER BY up.User_ID DESC`,
    [status]
  );
};

/**
 * Approve a user access request
 */
export const approveUser = async (userId) => {
  return query(
    `UPDATE User_Profile
     SET Status_Code = 'A', Request_Status = 'Accepted'
     WHERE User_ID = ?`,
    [userId]
  );
};

/**
 * Reject a user access request
 */
export const rejectUser = async (userId) => {
  return query(
    `UPDATE User_Profile
     SET Status_Code = 'I', Request_Status = 'Rejected'
     WHERE User_ID = ?`,
    [userId]
  );
};

/**
 * Count active users grouped by role
 */
export const countByRole = async () => {
  const rows = await query(
    `SELECT Role_Code as role, COUNT(*) as count
     FROM User_Profile
     WHERE Status_Code = 'A'
     GROUP BY Role_Code`
  );
  const counts = {};
  for (const r of rows) counts[r.role] = r.count;
  return counts;
};

/**
 * Valid sort columns — whitelist to prevent SQL injection.
 */
const SORT_COLUMNS = {
  userName: 'up.User_Name',
  fullName: 'up.Full_Name',
  email: 'up.PrimaryEmail',
  officeName: 'o.Office_Name',
  lastUpdated: 'up.User_lastupdated',
};

/**
 * Find active users filtered by role, with server-side search, sort, and pagination.
 * ADM/TRN: lightweight query (no LE assignment joins).
 * EXP: includes LE TG names via GROUP_CONCAT.
 *
 * @param {Object} opts
 * @param {string} [opts.role] - Filter by role code
 * @param {string} [opts.search] - Search across userName, fullName, email, officeName
 * @param {string} [opts.sort] - Sort column key (default: fullName)
 * @param {string} [opts.order] - Sort direction: 'asc' | 'desc' (default: asc)
 * @param {number} [opts.page] - Page number (default: 1)
 * @param {number} [opts.limit] - Items per page (default: 20)
 */
export const findAllUsers = async ({ role, search, sort, order, page = 1, limit = 20 } = {}) => {
  let where = `up.Status_Code = 'A'`;
  const params = [];

  if (role) {
    where += ` AND up.Role_Code = ?`;
    params.push(role);
  }

  if (search) {
    where += ` AND (up.User_Name LIKE ? OR up.Full_Name LIKE ? OR up.PrimaryEmail LIKE ? OR o.Office_Name LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  // Sort — use whitelist, fall back to fullName; leTgNames is a GROUP_CONCAT alias (EXP only)
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';
  let orderBy;
  if (sort === 'leTgNames' && role === 'EXP') {
    orderBy = `leTgNames ${sortDir}`;
  } else {
    orderBy = `${SORT_COLUMNS[sort] || 'up.Full_Name'} ${sortDir}`;
  }

  const offset = (page - 1) * limit;
  const needsLeJoin = role === 'EXP';

  let dataSql;
  if (needsLeJoin) {
    dataSql = `
      SELECT
        up.User_ID as id,
        up.User_Name as userName,
        up.Full_Name as fullName,
        up.PrimaryEmail as email,
        up.Role_Code as roleCode,
        up.Office_Code as officeCode,
        o.Office_Name as officeName,
        up.User_lastupdated as lastUpdated,
        GROUP_CONCAT(DISTINCT tg.TG_Name ORDER BY tg.TG_Name SEPARATOR '||') as leTgNames
      FROM User_Profile up
      LEFT JOIN Office o ON up.Office_Code = o.Office_Code
      LEFT JOIN Tg_Users tu ON up.User_ID = tu.User_ID AND tu.Role_Code = 'LE'
      LEFT JOIN TG tg ON tu.TG_ID = tg.TG_ID AND tg.Status_Code <> 'DEL'
      WHERE ${where}
      GROUP BY up.User_ID
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`;
  } else {
    dataSql = `
      SELECT
        up.User_ID as id,
        up.User_Name as userName,
        up.Full_Name as fullName,
        up.PrimaryEmail as email,
        up.Role_Code as roleCode,
        up.Office_Code as officeCode,
        o.Office_Name as officeName,
        up.User_lastupdated as lastUpdated
      FROM User_Profile up
      LEFT JOIN Office o ON up.Office_Code = o.Office_Code
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`;
  }

  // Count query — only needs User_Profile + Office (for officeName search), no LE joins
  const countSql = `
    SELECT COUNT(*) as total
    FROM User_Profile up
    LEFT JOIN Office o ON up.Office_Code = o.Office_Code
    WHERE ${where}`;

  // Run data + count in parallel
  const [items, countRow] = await Promise.all([
    query(dataSql, [...params, limit, offset]),
    queryOne(countSql, params),
  ]);

  return { items, total: countRow?.total || 0 };
};

/**
 * Find a single user by ID
 */
export const findUserById = async (id) => {
  return queryOne(
    `SELECT
      up.User_ID as id,
      up.User_Name as userName,
      up.Full_Name as fullName,
      up.PrimaryEmail as email,
      up.Role_Code as roleCode,
      up.Status_Code as statusCode,
      up.Request_Status as requestStatus,
      up.Office_Code as officeCode,
      o.Office_Name as officeName,
      up.TWPS as twps,
      up.User_lastupdated as lastUpdated
    FROM User_Profile up
    LEFT JOIN Office o ON up.Office_Code = o.Office_Code
    WHERE up.User_ID = ?`,
    [id]
  );
};

/**
 * Update a user's role code
 */
export const updateUserRole = async (id, roleCode) => {
  return query(
    `UPDATE User_Profile
     SET Role_Code = ?, User_lastupdated = NOW()
     WHERE User_ID = ?`,
    [roleCode, id]
  );
};

/**
 * Delete a user by ID
 */
export const deleteUser = async (id) => {
  return query(
    `DELETE FROM User_Profile WHERE User_ID = ?`,
    [id]
  );
};

/**
 * Count LE assignments for a user (to check before delete)
 */
export const countUserTgAssignments = async (userId) => {
  const row = await queryOne(
    `SELECT COUNT(*) as count FROM Tg_Users WHERE User_ID = ? AND Role_Code = 'LE'`,
    [userId]
  );
  return row.count;
};

/**
 * Find TWPs where user is assigned as LE on at least one TG.
 * Returns distinct TWP codes, e.g. ['TWV', 'TWO'].
 */
export const findLeTwps = async (userId) => {
  const rows = await query(
    `SELECT DISTINCT t.CPI_TechWorkParty as TWP
     FROM Tg_Users tu
     JOIN TG t ON tu.TG_ID = t.TG_ID
     WHERE tu.User_ID = ? AND tu.Role_Code = 'LE' AND t.Status_Code <> 'DEL'
       AND t.CPI_TechWorkParty IS NOT NULL`,
    [userId]
  );
  return rows.map((r) => r.TWP);
};

/**
 * Sync IE assignments for a user based on their TWPs.
 * - Assigns IE to TGs matching new TWPs (skips existing)
 * - Unassigns IE from TGs no longer matching any TWP
 */
export const syncIeAssignments = async (userId, twpsCsv) => {
  const twps = twpsCsv ? twpsCsv.split(',').map((t) => t.trim()).filter(Boolean) : [];

  // Remove IE assignments for TGs that no longer match any of the user's TWPs
  // (but never remove LE assignments)
  let removed = 0;
  if (twps.length === 0) {
    // No TWPs — remove all IE assignments
    const res = await query(
      `DELETE FROM Tg_Users WHERE User_ID = ? AND Role_Code = 'IE'`,
      [userId]
    );
    removed = res.affectedRows;
  } else {
    const placeholders = twps.map(() => '?').join(',');
    const res = await query(
      `DELETE FROM Tg_Users
       WHERE User_ID = ? AND Role_Code = 'IE'
         AND TG_ID NOT IN (
           SELECT t.TG_ID
           FROM TG t
           WHERE t.CPI_TechWorkParty IN (${placeholders})
             AND t.Status_Code <> 'DEL'
         )`,
      [userId, ...twps]
    );
    removed = res.affectedRows;
  }

  // Add IE assignments for matching TGs the user is not yet assigned to
  let assigned = 0;
  if (twps.length > 0) {
    const placeholders = twps.map(() => '?').join(',');
    const res = await query(
      `INSERT INTO Tg_Users (TG_ID, User_ID, Role_Code, Status_Code, Language_Code)
       SELECT t.TG_ID, ?, 'IE', 'A', 'EN'
       FROM TG t
       WHERE t.CPI_TechWorkParty IN (${placeholders})
         AND t.Status_Code <> 'DEL'
         AND NOT EXISTS (
           SELECT 1 FROM Tg_Users tu
           WHERE tu.TG_ID = t.TG_ID AND tu.User_ID = ?
         )`,
      [userId, ...twps, userId]
    );
    assigned = res.affectedRows;
  }

  return { assigned, removed };
};

/**
 * Update a user's TWPs
 */
export const updateTwps = async (userId, twps) => {
  return query(
    `UPDATE User_Profile
     SET TWPS = ?, User_lastupdated = NOW()
     WHERE User_ID = ?`,
    [twps, userId]
  );
};

/**
 * Get all offices for autocomplete
 */
export const countPendingRequests = async () => {
  const result = await queryOne(
    `SELECT COUNT(*) as total FROM User_Profile WHERE Request_Status = 'Pending'`
  );
  return parseInt(result?.total || 0, 10);
};

export const findAllOffices = async () => {
  const rows = await query(
    `SELECT Office_Code as code, Office_Name as name
     FROM Office
     ORDER BY Office_Name`
  );
  // Strip redundant code from name (e.g. "Albania, AL" → "Albania", "AFSTA, African Seed..." → "African Seed...")
  return rows.map((row) => ({
    ...row,
    name: row.name.replace(new RegExp(`(\\s*,\\s*)?\\b${row.code}\\b(\\s*,\\s*)?`), (match, before, after) => {
      // If code was between commas, collapse to single separator
      if (before && after) return ', ';
      return '';
    }).trim(),
  }));
};
