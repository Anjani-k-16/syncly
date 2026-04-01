import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { socketAuth } from '../middleware/auth.js';
import { redisPub, redisSub, redis, checkRateLimit } from '../config/redis.js';
import { query } from '../config/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { sendNewMessageEmail } from './emailService.js';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
    pingTimeout: 60000,
  });

  io.adapter(createAdapter(redisPub, redisSub));
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    const userId = socket.user.userId;
    socket.join(`user:${userId}`);
    await joinChannelRooms(socket, userId);
    await setOnline(userId, true, io);
    const keepAliveInterval = setInterval(async () => {
      await redis.set(`online:${userId}`, '1', 'EX', 90);
    }, 60000);
    socket.on('message:send', async (data, ack) => {
      try {
        const { channelId, content, type='text', replyTo, mediaUrl, mediaName, mediaSize } = data;

        const rl = await checkRateLimit(`rl:msg:${userId}`, 30, 60);
        if (!rl.allowed) return ack?.({ error: 'Rate limit: slow down' });

        const mem = await query(
          'SELECT 1 FROM channel_members WHERE channel_id=$1 AND user_id=$2',
          [channelId, userId]
        );
        if (!mem.rows[0]) return ack?.({ error: 'Not a member' });

        let stored = content || '', iv = null;
        if (stored) { const e = encrypt(stored); stored = e.ciphertext; iv = e.iv; }

        const r = await query(
          `INSERT INTO messages (channel_id,sender_id,content,iv,type,reply_to,media_url,media_name,media_size)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [channelId, userId, stored, iv, type, replyTo||null, mediaUrl||null, mediaName||null, mediaSize||null]
        );
        const msg = r.rows[0];

        const senderR = await query('SELECT id,username,avatar_url FROM users WHERE id=$1', [userId]);

        let repliedMessage = null;
        if (replyTo) {
          const replyR = await query(`
            SELECT m.id, m.content, m.iv, m.type,
              json_build_object('id',u.id,'username',u.username) as sender
            FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1`, [replyTo]);
          if (replyR.rows[0]) {
            repliedMessage = replyR.rows[0];
            if (repliedMessage.iv && repliedMessage.content) {
              try { repliedMessage.content = decrypt(repliedMessage.content, repliedMessage.iv); }
              catch { repliedMessage.content = '[encrypted]'; }
            }
          }
        }

        const full = {
          ...msg, content,
          sender: senderR.rows[0],
          replied_message: repliedMessage,
          reactions: [],
        };

        await query('UPDATE channels SET updated_at=NOW() WHERE id=$1', [channelId]);
        io.to(`channel:${channelId}`).emit('message:new', full);

        const channelRes = await query('SELECT name, type FROM channels WHERE id=$1', [channelId]);
        const channel = channelRes.rows[0];

        const membersRes = await query(
          `SELECT u.id, u.email, u.username FROM channel_members cm
           JOIN users u ON u.id=cm.user_id
           WHERE cm.channel_id=$1 AND cm.user_id!=$2`,
          [channelId, userId]
        );

        for (const member of membersRes.rows) {
          const onlineKey = await redis.get(`online:${member.id}`);
          console.log(`[email check] member ${member.username} online: ${!!onlineKey}`);

          if (onlineKey) {
            await query(
              `INSERT INTO message_receipts (message_id,user_id,delivered_at)
               VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING`,
              [msg.id, member.id]
            ).catch(()=>{});
          } else {
            const cooldownKey = `email:msg:${member.id}:${channelId}`;
            const alreadySent = await redis.get(cooldownKey);
            console.log(`[email check] cooldown exists: ${!!alreadySent}`);

            if (!alreadySent) {
              await redis.set(cooldownKey, '1', 'EX', 300);

              let messagePreview = content;
              if (!messagePreview) {
                if (type === 'image') messagePreview = '📷 Sent you an image';
                else if (type === 'file') messagePreview = `📎 ${mediaName || 'file'}`;
                else messagePreview = '💬 New message';
              }

              console.log(`[email] Sending to ${member.email}...`);
              sendNewMessageEmail({
                toEmail: member.email,
                toName: member.username,
                fromName: senderR.rows[0].username,
                message: messagePreview,
                channelName: channel.type !== 'direct' ? channel.name : null,
                appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
              }).then(() => console.log(`[email] ✅ Sent to ${member.email}`))
                .catch(err => console.error(`[email] ❌ Failed: ${err.message}`));
            }
          }
        }

        io.to(`user:${userId}`).emit('message:receipt', {
          messageId: msg.id, channelId, type: 'sent',
        });
        ack?.({ ok: true, message: full });
      } catch (e) {
        console.error('message:send error:', e);
        ack?.({ error: 'Failed' });
      }
    });
    socket.on('message:read', async ({ channelId, messageIds }) => {
      for (const msgId of (messageIds || [])) {
        await query(
          `INSERT INTO message_receipts (message_id,user_id,read_at,delivered_at)
           VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (message_id,user_id)
           DO UPDATE SET read_at=NOW(), delivered_at=COALESCE(message_receipts.delivered_at,NOW())`,
          [msgId, userId]
        ).catch(()=>{});
        const row = await query('SELECT sender_id FROM messages WHERE id=$1', [msgId]);
        if (row.rows[0]) {
          io.to(`user:${row.rows[0].sender_id}`).emit('message:receipt', {
            messageId: msgId, channelId, readBy: userId, type: 'read',
          });
        }
      }
    });
    socket.on('reaction:toggle', async ({ messageId, emoji, channelId }, ack) => {
      try {
        const existing = await query(
          'SELECT id FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
          [messageId, userId, emoji]
        );
        if (existing.rows[0]) {
          await query(
            'DELETE FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
            [messageId, userId, emoji]
          );
        } else {
          await query(
            'INSERT INTO message_reactions (message_id,user_id,emoji) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [messageId, userId, emoji]
          );
        }
        const reactions = await query(`
          SELECT emoji, COUNT(*)::int as count,
            json_agg(json_build_object('id',u.id,'username',u.username)) as users
          FROM message_reactions mr JOIN users u ON u.id=mr.user_id
          WHERE mr.message_id=$1 GROUP BY emoji ORDER BY count DESC
        `, [messageId]);
        io.to(`channel:${channelId}`).emit('reaction:update', {
          messageId, reactions: reactions.rows,
        });
        ack?.({ ok: true });
      } catch (e) {
        console.error('reaction error:', e);
        ack?.({ error: 'Failed' });
      }
    });
    socket.on('message:star', async ({ messageId }, ack) => {
      try {
        const existing = await query(
          'SELECT id FROM starred_messages WHERE message_id=$1 AND user_id=$2',
          [messageId, userId]
        );
        if (existing.rows[0]) {
          await query(
            'DELETE FROM starred_messages WHERE message_id=$1 AND user_id=$2',
            [messageId, userId]
          );
          ack?.({ ok: true, starred: false });
        } else {
          await query(
            'INSERT INTO starred_messages (message_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [messageId, userId]
          );
          ack?.({ ok: true, starred: true });
        }
      } catch (e) {
        console.error('star error:', e);
        ack?.({ error: 'Failed' });
      }
    });
    socket.on('messages:delete', async ({ messageIds, channelId }, ack) => {
      try {
        for (const msgId of messageIds) {
          const r = await query(
            'SELECT sender_id, channel_id FROM messages WHERE id=$1', [msgId]
          );
          if (!r.rows[0]) continue;
          const isAdmin = await query(
            `SELECT role FROM channel_members WHERE channel_id=$1 AND user_id=$2
             AND role IN ('owner','admin')`,
            [r.rows[0].channel_id, userId]
          );
          if (r.rows[0].sender_id === userId || isAdmin.rows[0]) {
            await query(
              `UPDATE messages SET is_deleted=true, content='[deleted]', iv=NULL WHERE id=$1`,
              [msgId]
            );
          }
        }
        io.to(`channel:${channelId}`).emit('messages:deleted', { messageIds, channelId });
        ack?.({ ok: true });
      } catch (e) {
        console.error('delete error:', e);
        ack?.({ error: 'Failed' });
      }
    });
    socket.on('typing:start', ({ channelId }) =>
      socket.to(`channel:${channelId}`).emit('typing:start', { userId, channelId }));
    socket.on('typing:stop', ({ channelId }) =>
      socket.to(`channel:${channelId}`).emit('typing:stop', { userId, channelId }));

    socket.on('channel:join', ({ channelId }) => socket.join(`channel:${channelId}`));

    socket.on('disconnect', async () => {
      clearInterval(keepAliveInterval);
      await setOnline(userId, false, io);
    });
  });

  return io;
}

async function joinChannelRooms(socket, userId) {
  const r = await query('SELECT channel_id FROM channel_members WHERE user_id=$1', [userId]);
  r.rows.forEach(row => socket.join(`channel:${row.channel_id}`));
}

async function setOnline(userId, isOnline, io) {
  if (isOnline) await redis.set(`online:${userId}`, '1', 'EX', 90);
  else await redis.del(`online:${userId}`);
  await query('UPDATE users SET is_online=$1, last_seen=NOW() WHERE id=$2', [isOnline, userId]);
  io.emit('user:status', { userId, isOnline, lastSeen: new Date() });
}