import { query, execute } from '../utils/db.js';

export const findTGIdsByStatus = async (statusCodes) => {
  const placeholders = statusCodes.map(() => '?').join(',');
  return query(
    `SELECT TG_ID FROM TG WHERE Status_Code IN (${placeholders})`,
    statusCodes
  );
};

export const deactivateIEUsers = async (tgIds) => {
  const placeholders = tgIds.map(() => '?').join(',');
  return execute(
    `UPDATE Tg_Users
     SET Status_Code = 'I'
     WHERE TG_ID IN (${placeholders}) AND Role_Code = 'IE'`,
    tgIds
  );
};
