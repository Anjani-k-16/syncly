import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('Gmail SMTP connected');
  } catch (err) {
    console.error('Gmail SMTP error:', err.message);
  }
}
export async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"Syncly" <${process.env.GMAIL_USER}>`,
      to, subject, html,
    });
    console.log(`[email] sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('[email] failed:', err.message);
  }
}

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#080A0F; font-family:Arial,sans-serif; color:#E8EDF5; }
    .container { max-width:520px; margin:40px auto; background:#0E1117; border:1px solid #1E2433; border-radius:20px; overflow:hidden; }
    .header { background:linear-gradient(135deg,#080A0F 0%,#0E1117 100%); padding:32px; text-align:center; border-bottom:1px solid #1E2433; }
    .logo { display:inline-flex; align-items:center; gap:10px; }
    .logo-icon { width:36px; height:36px; background:#00D4FF; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; font-size:18px; }
    .logo-text { font-size:24px; font-weight:700; color:#E8EDF5; letter-spacing:-0.5px; }
    .body { padding:32px; }
    .message-box { background:#131720; border:1px solid #1E2433; border-radius:14px; padding:20px; margin:20px 0; }
    .sender { font-size:13px; color:#00D4FF; font-weight:600; margin-bottom:6px; }
    .message-text { font-size:15px; color:#E8EDF5; line-height:1.6; }
    .btn { display:block; width:fit-content; margin:24px auto 0; background:#00D4FF; color:#080A0F; text-decoration:none; padding:14px 32px; border-radius:12px; font-weight:700; font-size:15px; text-align:center; }
    .footer { padding:20px 32px; border-top:1px solid #1E2433; text-align:center; }
    .footer p { font-size:11px; color:#7A8BA5; line-height:1.6; }
    .badge { display:inline-block; background:#1E2433; color:#00D4FF; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; margin-bottom:16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <div class="logo-icon"></div>
        <span class="logo-text">Syncly</span>
      </div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>You received this because you have an account on Syncly.<br/>
      Real-time messaging · End-to-end encrypted · AES-256-GCM</p>
    </div>
  </div>
</body>
</html>
`;

export async function sendNewMessageEmail({ toEmail, toName, fromName, message, channelName, appUrl }) {
  const preview = message.length > 120 ? message.slice(0, 120) + '…' : message;
  const content = `
    <div class="badge">New Message</div>
    <p style="font-size:16px;font-weight:600;color:#E8EDF5;margin-bottom:8px;">
      Hey ${toName}, you have a new message!
    </p>
    <p style="font-size:13px;color:#7A8BA5;margin-bottom:0;">
      ${fromName} sent you a message
      ${channelName ? `in <strong style="color:#E8EDF5">${channelName}</strong>` : ''}
    </p>
    <div class="message-box">
      <div class="sender">${fromName}</div>
      <div class="message-text">${preview}</div>
    </div>
    <a href="${appUrl || 'http://localhost:3000'}" class="btn">Open Syncly →</a>
  `;
  await sendEmail({
    to: toEmail,
    subject: `New message from ${fromName} on Syncly`,
    html: baseTemplate(content),
  });
}

export async function sendNewDMEmail({ toEmail, toName, fromName, appUrl }) {
  const content = `
    <div class="badge">New Conversation</div>
    <p style="font-size:16px;font-weight:600;color:#E8EDF5;margin-bottom:8px;">
      Someone wants to chat with you!
    </p>
    <p style="font-size:13px;color:#7A8BA5;margin-bottom:0;">
      <strong style="color:#00D4FF">${fromName}</strong> started a direct message with you.
    </p>
    <div class="message-box">
      <div class="sender">${fromName}</div>
      <div class="message-text">Started a new conversation with you</div>
    </div>
    <a href="${appUrl || 'http://localhost:3000'}" class="btn">Reply on Syncly →</a>
  `;
  await sendEmail({
    to: toEmail,
    subject: `${fromName} started a DM with you on Syncly`,
    html: baseTemplate(content),
  });
}

export async function sendAddedToGroupEmail({ toEmail, toName, addedBy, groupName, appUrl }) {
  const content = `
    <div class="badge">Added to Group</div>
    <p style="font-size:16px;font-weight:600;color:#E8EDF5;margin-bottom:8px;">
      You've been added to a group!
    </p>
    <p style="font-size:13px;color:#7A8BA5;margin-bottom:0;">
      <strong style="color:#00D4FF">${addedBy}</strong> added you to
      <strong style="color:#E8EDF5">"${groupName}"</strong>.
    </p>
    <div class="message-box">
      <div class="sender">${groupName}</div>
      <div class="message-text">You're now a member. Join the conversation!</div>
    </div>
    <a href="${appUrl || 'http://localhost:3000'}" class="btn">Open Group →</a>
  `;
  await sendEmail({
    to: toEmail,
    subject: `You were added to "${groupName}" on Syncly`,
    html: baseTemplate(content),
  });
}

export async function sendDailyDigestEmail({ toEmail, toName, missedMessages, appUrl }) {
  const total = missedMessages.reduce((sum, c) => sum + c.count, 0);
  const channelRows = missedMessages.map(c => `
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:10px 0;border-bottom:1px solid #1E2433;">
      <div>
        <div style="font-size:13px;font-weight:600;color:#E8EDF5;">${c.name}</div>
        <div style="font-size:11px;color:#7A8BA5;">${c.lastMessage}</div>
      </div>
      <div style="background:#00D4FF;color:#080A0F;border-radius:20px;
        padding:2px 10px;font-size:11px;font-weight:700;white-space:nowrap;">
        ${c.count} new
      </div>
    </div>
  `).join('');
  const content = `
    <div class="badge">Daily Digest</div>
    <p style="font-size:16px;font-weight:600;color:#E8EDF5;margin-bottom:8px;">
      You missed ${total} message${total !== 1 ? 's' : ''} yesterday
    </p>
    <p style="font-size:13px;color:#7A8BA5;margin-bottom:20px;">
      Here's what happened on Syncly while you were away:
    </p>
    <div class="message-box">${channelRows}</div>
    <a href="${appUrl || 'http://localhost:3000'}" class="btn">Catch Up on Syncly →</a>
  `;
  await sendEmail({
    to: toEmail,
    subject: `You missed ${total} message${total !== 1 ? 's' : ''} on Syncly`,
    html: baseTemplate(content),
  });
}