import crypto from 'crypto';

const KEY = Buffer.from(
  (process.env.ENCRYPTION_KEY || 'syncly_fallback_key_32chars_here').padEnd(32, '!').slice(0, 32)
);

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  let enc = cipher.update(text, 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return { ciphertext: enc, iv: iv.toString('hex') + ':' + tag };
}

export function decrypt(ciphertext, ivPacked) {
  try {
    const [ivHex, tag] = ivPacked.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let dec = decipher.update(ciphertext, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch { return '[encrypted]'; }
}
