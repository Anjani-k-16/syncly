import { query } from '../config/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export const getMessages = async (req, reply) => {
  const { channelId } = req.params;
  const { before, limit = 50 } = req.query;
  const uid = req.user.userId;
  const cap = Math.min(Number(limit), 100);

  const mem = await query(
    'SELECT 1 FROM channel_members WHERE channel_id=$1 AND user_id=$2',
    [channelId, uid]
  );
  if (!mem.rows[0]) return reply.code(403).send({ error: 'Not a member' });

  let sql = `
    SELECT m.*,
      json_build_object('id',u.id,'username',u.username,'avatar_url',u.avatar_url) AS sender,
      (SELECT json_agg(json_build_object(
        'user_id',mr.user_id,'delivered_at',mr.delivered_at,'read_at',mr.read_at
      )) FROM message_receipts mr WHERE mr.message_id=m.id) AS receipts,
      (SELECT json_agg(json_build_object(
        'emoji',r.emoji,'count',r.cnt,'users',r.users
      )) FROM (
        SELECT emoji, COUNT(*)::int as cnt,
          json_agg(json_build_object('id',u2.id,'username',u2.username)) as users
        FROM message_reactions mr2
        JOIN users u2 ON u2.id=mr2.user_id
        WHERE mr2.message_id=m.id
        GROUP BY emoji
      ) r) AS reactions,
      CASE WHEN m.reply_to IS NOT NULL THEN
        json_build_object(
          'id', rm.id,
          'content', rm.content,
          'iv', rm.iv,
          'type', rm.type,
          'sender', json_build_object('id',ru.id,'username',ru.username)
        )
      ELSE NULL END AS replied_message
    FROM messages m
    JOIN users u ON u.id=m.sender_id
    LEFT JOIN messages rm ON rm.id=m.reply_to
    LEFT JOIN users ru ON ru.id=rm.sender_id
    WHERE m.channel_id=$1 AND m.is_deleted=false`;

  const params = [channelId];
  if (before) {
    sql += ` AND m.created_at < (SELECT created_at FROM messages WHERE id=$${params.length+1})`;
    params.push(before);
  }
  sql += ` ORDER BY m.created_at DESC LIMIT $${params.length+1}`;
  params.push(cap);

  const r = await query(sql, params);
  const messages = r.rows.map(m => {
    if (m.iv && m.content) {
      try { m.content = decrypt(m.content, m.iv); } catch { m.content = '[encrypted]'; }
    }
    if (m.replied_message?.iv && m.replied_message?.content) {
      try { m.replied_message.content = decrypt(m.replied_message.content, m.replied_message.iv); }
      catch { m.replied_message.content = '[encrypted]'; }
    }
    if (!m.reactions) m.reactions = [];
    return m;
  }).reverse();

  for (const m of messages) {
    await query(
      `INSERT INTO message_receipts (message_id,user_id,delivered_at)
       VALUES ($1,$2,NOW()) ON CONFLICT (message_id,user_id)
       DO UPDATE SET delivered_at=COALESCE(message_receipts.delivered_at,NOW())`,
      [m.id, uid]
    ).catch(()=>{});
  }

  return reply.send({
    messages,
    hasMore: messages.length === cap,
    nextCursor: r.rows[r.rows.length-1]?.id || null,
  });
};

export const markRead = async (req, reply) => {
  const { channelId } = req.params;
  const uid = req.user.userId;
  await query(`
    UPDATE message_receipts mr SET read_at=NOW()
    FROM messages m WHERE mr.message_id=m.id
    AND m.channel_id=$1 AND mr.user_id=$2 AND mr.read_at IS NULL`,
    [channelId, uid]);
  return reply.send({ ok: true });
};

export const deleteMessage = async (req, reply) => {
  const { messageId } = req.params;
  const uid = req.user.userId;
  const r = await query('SELECT * FROM messages WHERE id=$1', [messageId]);
  if (!r.rows[0]) return reply.code(404).send({ error: 'Not found' });
  const isAdmin = await query(
    `SELECT role FROM channel_members WHERE channel_id=$1 AND user_id=$2 AND role IN ('owner','admin')`,
    [r.rows[0].channel_id, uid]
  );
  if (r.rows[0].sender_id !== uid && !isAdmin.rows[0])
    return reply.code(403).send({ error: 'Forbidden' });
  await query(
    `UPDATE messages SET is_deleted=true, content='[deleted]', iv=NULL WHERE id=$1`,
    [messageId]
  );
  return reply.send({ ok: true });
};