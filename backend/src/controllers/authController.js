import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/database.js';
import { signAccess, signRefresh, verifyRefresh } from '../middleware/auth.js';
import { sendEmail } from '../services/emailService.js';

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function issueTokens(userId) {
  const accessToken  = signAccess({ userId });
  const refreshToken = signRefresh({ userId });
  const expiresAt = new Date(Date.now() + 7 * 86400 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [userId, hashToken(refreshToken), expiresAt]
  );
  return { accessToken, refreshToken };
}


export const sendOTP = async (req, reply) => {
  const { email } = req.body;
  if (!email) return reply.code(400).send({ error: 'Email required' });

  const cleanEmail = email.trim().toLowerCase();

  const existing = await query('SELECT id FROM users WHERE email=$1', [cleanEmail]);
  if (existing.rows[0]) return reply.code(409).send({ error: 'Email already registered' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await query('DELETE FROM email_otps WHERE email=$1', [cleanEmail]);
  await query(
    'INSERT INTO email_otps (email, otp, expires_at) VALUES ($1,$2,$3)',
    [cleanEmail, otp, expiresAt]
  );

  console.log(`[OTP] Sending to ${cleanEmail}: ${otp}`);

  await sendEmail({
    to: cleanEmail,
    subject: 'Your Syncly verification code',
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <style>
        body{background:#080A0F;font-family:Arial,sans-serif;color:#E8EDF5;margin:0;padding:20px}
        .c{max-width:500px;margin:0 auto;background:#0E1117;border:1px solid #1E2433;border-radius:20px;overflow:hidden}
        .h{padding:24px 32px;border-bottom:1px solid #1E2433;text-align:center;font-size:22px;font-weight:700}
        .b{padding:32px;text-align:center}
        .otp{font-size:48px;font-weight:700;letter-spacing:12px;color:#00D4FF;
          background:#131720;border:2px solid #1E2433;border-radius:16px;
          padding:20px 32px;margin:24px 0;display:inline-block;font-family:monospace}
        .f{padding:16px 32px;border-top:1px solid #1E2433;text-align:center;font-size:11px;color:#7A8BA5}
        .w{background:#FF3CAC11;border:1px solid #FF3CAC44;border-radius:10px;
          padding:12px;margin-top:16px;font-size:12px;color:#FF3CAC}
      </style></head>
      <body><div class="c">
        <div class="h">Sync<span style="color:#00D4FF">ly</span></div>
        <div class="b">
          <p style="font-size:18px;font-weight:700;margin-bottom:8px">Verify your email</p>
          <p style="color:#7A8BA5;font-size:14px">Enter this code in Syncly:</p>
          <div class="otp">${otp}</div>
          <div class="w">⏱ Expires in <strong>15 minutes</strong></div>
        </div>
        <div class="f">Syncly · Real-time encrypted messaging</div>
      </div></body></html>
    `,
  });

  return reply.send({ message: 'OTP sent!' });
};


export const verifyOTP = async (req, reply) => {
  const { email, otp } = req.body;
  if (!email || !otp) return reply.code(400).send({ error: 'Email and OTP required' });

  const cleanEmail = email.trim().toLowerCase();
  const cleanOTP   = otp.trim();

  console.log(`[OTP] Verifying for ${cleanEmail}: entered=${cleanOTP}`);

  const allOTPs = await query(
    'SELECT * FROM email_otps WHERE email=$1 ORDER BY created_at DESC LIMIT 3',
    [cleanEmail]
  );
  console.log(`[OTP] DB records:`, allOTPs.rows);

  const r = await query(
    `SELECT * FROM email_otps
     WHERE email=$1 AND otp=$2 AND expires_at>NOW() AND verified=false`,
    [cleanEmail, cleanOTP]
  );

  if (!r.rows[0]) {
    const anyMatch = await query(
      'SELECT otp, expires_at, verified, NOW() as now FROM email_otps WHERE email=$1 AND otp=$2',
      [cleanEmail, cleanOTP]
    );
    if (anyMatch.rows[0]) {
      const row = anyMatch.rows[0];
      if (row.verified) {
        return reply.code(400).send({ error: 'OTP already used. Please request a new one.' });
      }
      if (new Date(row.expires_at) < new Date()) {
        return reply.code(400).send({ error: 'OTP has expired. Please request a new one.' });
      }
    }
    return reply.code(400).send({ error: 'Invalid OTP. Please check and try again.' });
  }

  await query('UPDATE email_otps SET verified=true WHERE id=$1', [r.rows[0].id]);
  console.log(`[OTP] Verified for ${cleanEmail}`);
  return reply.send({ message: 'Email verified!', verified: true });
};


export const register = async (req, reply) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return reply.code(400).send({ error: 'All fields required' });
  if (password.length < 8)
    return reply.code(400).send({ error: 'Password min 8 characters' });

  const cleanEmail = email.trim().toLowerCase();

  
  const otpCheck = await query(
    `SELECT id FROM email_otps
     WHERE email=$1 AND verified=true
     AND created_at > NOW() - INTERVAL '30 minutes'`,
    [cleanEmail]
  );

  if (!otpCheck.rows[0]) {
    return reply.code(400).send({
      error: 'Email not verified. Please go back and verify your email first.'
    });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const r = await query(
      `INSERT INTO users (username,email,password_hash) VALUES ($1,$2,$3)
       RETURNING id,username,email,avatar_url,created_at`,
      [username.trim().toLowerCase(), cleanEmail, hash]
    );
    await query('DELETE FROM email_otps WHERE email=$1', [cleanEmail]);
    const tokens = await issueTokens(r.rows[0].id);
    return reply.code(201).send({ user: r.rows[0], ...tokens });
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ error: 'Username or email taken' });
    req.log.error(e);
    return reply.code(500).send({ error: 'Server error' });
  }
};

export const login = async (req, reply) => {
  const { email, password } = req.body;
  if (!email || !password) return reply.code(400).send({ error: 'All fields required' });
  const r = await query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
  const user = r.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return reply.code(401).send({ error: 'Invalid credentials' });
  await query('UPDATE users SET is_online=true, last_seen=NOW() WHERE id=$1', [user.id]);
  const tokens = await issueTokens(user.id);
  const { password_hash, ...safe } = user;
  return reply.send({ user: { ...safe, is_online: true }, ...tokens });
};

export const refresh = async (req, reply) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return reply.code(400).send({ error: 'Token required' });
  let payload;
  try { payload = verifyRefresh(refreshToken); }
  catch { return reply.code(401).send({ error: 'Invalid token' }); }
  const r = await query(
    'SELECT * FROM refresh_tokens WHERE token_hash=$1 AND expires_at>NOW()',
    [hashToken(refreshToken)]
  );
  if (!r.rows[0]) return reply.code(401).send({ error: 'Token revoked' });
  await query('DELETE FROM refresh_tokens WHERE token_hash=$1', [hashToken(refreshToken)]);
  const tokens = await issueTokens(payload.userId);
  return reply.send(tokens);
};

export const logout = async (req, reply) => {
  const { refreshToken } = req.body || {};
  if (refreshToken)
    await query('DELETE FROM refresh_tokens WHERE token_hash=$1', [hashToken(refreshToken)]);
  if (req.user)
    await query('UPDATE users SET is_online=false, last_seen=NOW() WHERE id=$1', [req.user.userId]);
  return reply.send({ message: 'Logged out' });
};

export const getMe = async (req, reply) => {
  const r = await query(
    'SELECT id,username,email,avatar_url,is_online,last_seen,created_at FROM users WHERE id=$1',
    [req.user.userId]
  );
  if (!r.rows[0]) return reply.code(404).send({ error: 'Not found' });
  return reply.send({ user: r.rows[0] });
};

export const forgotPassword = async (req, reply) => {
  const { email } = req.body;
  if (!email) return reply.code(400).send({ error: 'Email required' });
  const r = await query('SELECT id, username FROM users WHERE email=$1', [email.toLowerCase()]);
  if (!r.rows[0]) return reply.send({ message: 'If that email exists, a reset link was sent' });
  const user = r.rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await query('DELETE FROM password_reset_tokens WHERE user_id=$1', [user.id]);
  await query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [user.id, tokenHash, expiresAt]
  );
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Reset your Syncly password',
    html: `
      <!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <style>
        body{background:#080A0F;font-family:Arial,sans-serif;color:#E8EDF5;margin:0;padding:20px}
        .c{max-width:520px;margin:0 auto;background:#0E1117;border:1px solid #1E2433;border-radius:20px;overflow:hidden}
        .h{padding:32px;text-align:center;border-bottom:1px solid #1E2433;font-size:24px;font-weight:700}
        .b{padding:32px}
        .btn{display:block;width:fit-content;margin:24px auto;background:#00D4FF;color:#080A0F;
          text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px}
        .f{padding:20px;border-top:1px solid #1E2433;text-align:center;font-size:11px;color:#7A8BA5}
        .w{background:#FF3CAC11;border:1px solid #FF3CAC44;border-radius:10px;
          padding:12px;margin-top:16px;font-size:12px;color:#FF3CAC}
      </style></head>
      <body><div class="c">
        <div class="h">Sync<span style="color:#00D4FF">ly</span></div>
        <div class="b">
          <p style="font-size:16px;font-weight:600">Hey ${user.username}! </p>
          <p style="color:#7A8BA5;font-size:14px">We received a request to reset your password.</p>
          <a href="${resetUrl}" class="btn">Reset My Password →</a>
          <div class="w">Expires in <strong>1 hour</strong>.</div>
        </div>
        <div class="f">Syncly · Real-time encrypted messaging</div>
      </div></body></html>
    `,
  });
  return reply.send({ message: 'If that email exists, a reset link was sent' });
};

export const resetPassword = async (req, reply) => {
  const { token, password } = req.body;
  if (!token || !password) return reply.code(400).send({ error: 'Token and password required' });
  if (password.length < 8) return reply.code(400).send({ error: 'Password min 8 characters' });
  const tokenHash = hashToken(token);
  const r = await query(
    'SELECT * FROM password_reset_tokens WHERE token_hash=$1 AND expires_at>NOW() AND used=false',
    [tokenHash]
  );
  if (!r.rows[0]) return reply.code(400).send({ error: 'Invalid or expired reset link' });
  const hash = await bcrypt.hash(password, 12);
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, r.rows[0].user_id]);
  await query('UPDATE password_reset_tokens SET used=true WHERE token_hash=$1', [tokenHash]);
  await query('DELETE FROM refresh_tokens WHERE user_id=$1', [r.rows[0].user_id]);
  return reply.send({ message: 'Password reset successful' });
};