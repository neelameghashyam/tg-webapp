/**
 * Deadline Reminder
 *
 * Sends email notifications to Lead Experts (LE), Interested Experts (IE),
 * and EDC Members about upcoming deadlines.
 *
 * Runs daily at 4:10 AM UTC (after status updater).
 * Schedule: cron(10 4 * * ? *)
 */
import * as reminderRepo from '../repositories/reminder.js';
import { sendEmail, formatDate } from '../utils/mail.js';

const REMINDER_INTERVALS = {
  start: 0,       // On start date
  weekBefore: 7,  // 7 days before end
};

// ── Shared email chrome ───────────────────────────────────────────────────────

const HEADER_HTML = `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0efeb;padding:24px 0;">
  <tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" width="620" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(28,66,64,0.1);">
    <tr><td style="background-color:#1C4240;padding:0;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 40px;">
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:21px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">
          UPOV <span style="color:#DADE14;">-</span> TG Template
        </td></tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="background-color:#DADE14;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:36px 40px 0 40px;">
`;

const FOOTER_HTML = `
    </td></tr>
    <tr><td style="padding:28px 40px 0 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="border-top:1px solid #B8B4A4;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:20px 40px 28px 40px;">
      <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a8678;margin:0;line-height:1.8;">
        <b style="color:#1C4240;">International Union for the Protection of New Varieties of Plants (UPOV)</b><br>
        34, chemin des Colombettes, CH-1211 Geneva 20<br>
        Tel: +41-22-338 9111 &middot; Fax: +41-22-733 0336<br>
        E-mail: <a href="mailto:upov.mail@upov.int" style="color:inherit;font-weight:bold;text-decoration:underline;text-decoration-color:#DADE14;">upov.mail@upov.int</a>
        &middot;
        Web: <a href="https://www.upov.int" style="color:inherit;font-weight:bold;text-decoration:underline;text-decoration-color:#DADE14;">www.upov.int</a>
      </p>
    </td></tr>
  </table>
  </td></tr>
</table>
`;

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  console.log('Deadline Reminder started');

  const results = {
    leDraft:    { sent: 0, errors: 0 },
    ieComments: { sent: 0, errors: 0 },
    leChecking: { sent: 0, errors: 0 },
    eccPhase:   { sent: 0, errors: 0 },
  };

  try {
    // ── TWP pipeline ──────────────────────────────────────────────────────────
    await sendReminders('LE Draft',    'LED', 'LE_Draft',    'LE', results.leDraft);
    await sendReminders('IE Comments', 'IEC', 'IE_Comments', 'IE', results.ieComments);
    await sendReminders('LE Checking', 'LEC', 'LE_Checking', 'LE', results.leChecking);

    // ── TC-EDC pipeline ───────────────────────────────────────────────────────
    await sendEccReminders(results.eccPhase);

    console.log('Deadline Reminder completed', results);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Deadline reminders sent', results }),
    };
  } catch (error) {
    console.error('Deadline Reminder error:', error);
    throw error;
  }
};

// ── TWP helper ────────────────────────────────────────────────────────────────

async function sendReminders(phaseName, statusCode, datePrefix, roleCode, stats) {
  const startDateCol = `${datePrefix}_StartDate`;
  const endDateCol   = `${datePrefix}_EndDate`;

  const startRecipients      = await reminderRepo.findPhaseStartReminders(startDateCol, endDateCol, REMINDER_INTERVALS.start, statusCode, roleCode);
  const weekBeforeRecipients = await reminderRepo.findPhaseEndReminders(startDateCol, endDateCol, REMINDER_INTERVALS.weekBefore, statusCode, roleCode);

  const recipientMap = new Map();
  for (const r of [...startRecipients, ...weekBeforeRecipients]) {
    if (!recipientMap.has(r.email)) {
      recipientMap.set(r.email, { email: r.email, firstName: r.firstName, tgs: [] });
    }
    recipientMap.get(r.email).tgs.push({ reference: r.tgReference, startDate: r.startDate, endDate: r.endDate });
  }

  for (const [email, recipient] of recipientMap) {
    try {
      const tgList = recipient.tgs
        .map((tg) => `<li>${tg.reference} <b>(${formatDate(tg.startDate)} - ${formatDate(tg.endDate)})</b></li>`)
        .join('\n');

      const htmlBody = HEADER_HTML + `
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1C4240;margin:0 0 20px 0;line-height:1.5;font-weight:bold;">
          Dear ${recipient.firstName || 'Colleague'},
        </p>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333333;margin:0 0 24px 0;line-height:1.6;">
          This is a reminder about the following Test Guidelines in the <b>${phaseName}</b> phase:
        </p>
        <ul style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333333;line-height:1.8;margin:0 0 24px 0;">
          ${tgList}
        </ul>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333333;margin:0 0 24px 0;line-height:1.6;">
          Please visit the <a href="https://www3.wipo.int/upovtg" style="color:#1C4240;font-weight:bold;">TG Template application</a> to take action.
        </p>
      ` + FOOTER_HTML;

      await sendEmail({ to: email, subject: `TG Template - ${phaseName} Reminder`, htmlBody });
      stats.sent++;
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error.message);
      stats.errors++;
    }
  }

  console.log(`${phaseName}: sent ${stats.sent}, errors ${stats.errors}`);
}

// ── TC-EDC ECC helper ─────────────────────────────────────────────────────────

async function sendEccReminders(stats) {
  const startRecipients      = await reminderRepo.findEccStartReminders(REMINDER_INTERVALS.start);
  const weekBeforeRecipients = await reminderRepo.findEccEndReminders(REMINDER_INTERVALS.weekBefore);

  const recipientMap = new Map();
  for (const r of [...startRecipients, ...weekBeforeRecipients]) {
    if (!recipientMap.has(r.email)) {
      recipientMap.set(r.email, { email: r.email, firstName: r.firstName, tgs: [] });
    }
    recipientMap.get(r.email).tgs.push({ reference: r.tgReference, startDate: r.startDate, endDate: r.endDate });
  }

  for (const [email, recipient] of recipientMap) {
    try {
      const tgList = recipient.tgs
        .map((tg) => `<li>${tg.reference} <b>(${formatDate(tg.startDate)} - ${formatDate(tg.endDate)})</b></li>`)
        .join('\n');

      const htmlBody = HEADER_HTML + `
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#1C4240;margin:0 0 20px 0;line-height:1.5;font-weight:bold;">
          Dear ${recipient.firstName || 'Colleague'},
        </p>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333333;margin:0 0 24px 0;line-height:1.6;">
          This is a reminder about the following Test Guidelines in the <b>EDC Comments</b> phase:
        </p>
        <ul style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333333;line-height:1.8;margin:0 0 24px 0;">
          ${tgList}
        </ul>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#333333;margin:0 0 24px 0;line-height:1.6;">
          Please visit the <a href="https://www3.wipo.int/upovtg" style="color:#1C4240;font-weight:bold;">TG Template application</a> to review and submit your comments.
        </p>
      ` + FOOTER_HTML;

      await sendEmail({ to: email, subject: 'TG Template - EDC Comments Reminder', htmlBody });
      stats.sent++;
    } catch (error) {
      console.error(`Failed to send EDC reminder to ${email}:`, error.message);
      stats.errors++;
    }
  }

  console.log(`EDC Comments: sent ${stats.sent}, errors ${stats.errors}`);
}