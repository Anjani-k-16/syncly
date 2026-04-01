import { query } from '../config/database.js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getProfile = async (req, reply) => {
  const { userId } = req.params;
  const r = await query(
    'SELECT id,username,email,avatar_url,is_online,last_seen,created_at FROM users WHERE id=$1',
    [userId]
  );
  if (!r.rows[0]) return reply.code(404).send({ error: 'User not found' });
  return reply.send({ user: r.rows[0] });
};

export const updateProfile = async (req, reply) => {
  const userId = req.user.userId;
  const { username } = req.body;

  if (!username || username.length < 2)
    return reply.code(400).send({ error: 'Username must be at least 2 characters' });

  try {
    const r = await query(
      `UPDATE users SET username=$1, updated_at=NOW()
       WHERE id=$2 RETURNING id,username,email,avatar_url,is_online`,
      [username.trim().toLowerCase(), userId]
    );
    return reply.send({ user: r.rows[0] });
  } catch (e) {
    if (e.code === '23505') return reply.code(409).send({ error: 'Username already taken' });
    return reply.code(500).send({ error: 'Server error' });
  }
};

export const uploadAvatar = async (req, reply) => {
  const userId = req.user.userId;
  const data = await req.file();
  if (!data) return reply.code(400).send({ error: 'No file' });

  const { mimetype, file } = data;
  if (!mimetype.startsWith('image/'))
    return reply.code(400).send({ error: 'Only images allowed' });

  const chunks = []; let size = 0;
  for await (const chunk of file) {
    size += chunk.length;
    if (size > 5 * 1024 * 1024) return reply.code(413).send({ error: 'Max 5MB' });
    chunks.push(chunk);
  }

  const result = await new Promise((res, rej) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'syncly/avatars',
        public_id: `avatar_${userId}`,
        overwrite: true,
        transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
      },
      (e, r) => e ? rej(e) : res(r)
    );
    stream.end(Buffer.concat(chunks));
  });

  await query(
    'UPDATE users SET avatar_url=$1, updated_at=NOW() WHERE id=$2',
    [result.secure_url, userId]
  );

  return reply.send({ avatarUrl: result.secure_url });
};