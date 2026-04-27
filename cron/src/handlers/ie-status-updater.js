/**
 * IE Status Updater
 *
 * Sets Interested Expert (IE) users to Inactive for TGs in LEC or LES status.
 * Runs daily at 4:05 AM UTC (after TG status updater).
 *
 * Schedule: cron(5 4 * * ? *)
 */
import * as tgUserRepo from '../repositories/tg-user.js';

export const handler = async (event) => {
  console.log('IE Status Updater started');

  try {
    const tgRows = await tgUserRepo.findTGIdsByStatus(['LEC', 'LES']);

    if (tgRows.length === 0) {
      console.log('No TGs in LEC or LES status');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No TGs to process', updated: 0 }),
      };
    }

    const ids = tgRows.map((row) => row.TG_ID);
    console.log(`Found ${ids.length} TGs in LEC/LES status`);

    const result = await tgUserRepo.deactivateIEUsers(ids);
    console.log(`Updated ${result.affectedRows} IE users to Inactive`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'IE status update completed',
        tgsProcessed: ids.length,
        usersUpdated: result.affectedRows,
      }),
    };
  } catch (error) {
    console.error('IE Status Updater error:', error);
    throw error;
  }
};
