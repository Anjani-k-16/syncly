import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function verifyEmailConnection() {
  console.log('Resend email service initialized');
}

export async function sendEmail({ to, subject, html }) {
  try {
    await resend.emails.send({
      from: 'Syncly <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    console.log(`[email] sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('[email] failed:', err.message);
  }
}

export async function sendNewMessageEmail({ toEmail, toName, fromName, message, channelName, appUrl }) {
  const preview = message.length > 120 ? message.slice(0, 120) + '…' : message;
  await sendEmail({
    to: toEmail,
    subject: `New message from ${fromName} on Syncly`,
    html: `<p>Hey ${toName}, ${fromName} sent you a message${channelName ? ` in ${channelName}` : ''}: ${preview}</p>`,
  });
}

export async function sendNewDMEmail({ toEmail, toName, fromName, appUrl }) {
  await sendEmail({
    to: toEmail,
    subject: `${fromName} started a DM with you on Syncly`,
    html: `<p>Hey ${toName}, ${fromName} started a direct message with you.</p>`,
  });
}

export async function sendAddedToGroupEmail({ toEmail, toName, addedBy, groupName, appUrl }) {
  await sendEmail({
    to: toEmail,
    subject: `You were added to "${groupName}" on Syncly`,
    html: `<p>Hey ${toName}, ${addedBy} added you to "${groupName}".</p>`,
  });
}

export async function sendDailyDigestEmail({ toEmail, toName, missedMessages, appUrl }) {
  const total = missedMessages.reduce((sum, c) => sum + c.count, 0);
  await sendEmail({
    to: toEmail,
    subject: `You missed ${total} message${total !== 1 ? 's' : ''} on Syncly`,
    html: `<p>Hey ${toName}, you missed ${total} messages on Syncly.</p>`,
  });
}