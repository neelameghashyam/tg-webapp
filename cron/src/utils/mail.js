import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION || 'eu-central-1' });

/**
 * Send email via AWS SES
 */
export const sendEmail = async ({ to, subject, htmlBody }) => {
  const fromEmail = process.env.MAIL_FROM_ID || 'noreply@upov.int';
  const bccEmail = 'tgtemplate@upov.int';

  // Check if mail sending is enabled
  if (process.env.SEND_MAIL !== 'TRUE') {
    console.log(`[MAIL DISABLED] Would send to: ${to}, subject: ${subject}`);
    return { messageId: 'disabled' };
  }

  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: {
      ToAddresses: [to],
      BccAddresses: [bccEmail],
    },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: htmlBody, Charset: 'UTF-8' },
      },
    },
  });

  const result = await ses.send(command);
  console.log(`Email sent to ${to}: ${result.MessageId}`);
  return { messageId: result.MessageId };
};

/**
 * Format date for email
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};
