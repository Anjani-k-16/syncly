import { query } from '../config/database.js';
import { sendNewDMEmail, sendAddedToGroupEmail } from '../services/emailService.js';

const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export const getMyChannels = async (req, reply) => {
  const uid = req.user.userId;
  const r = await query(`
    SELECT c.*, cm.role, cm.joined_at,
      (SELECT COUNT(*) FROM channel_members WHERE channel_id=c.id)::int AS member_count,
      (SELECT row_to_json(u) FROM (
         SELECT u2.id,u2.username,u2.avatar_url,u2.is_online,u2.last_seen
         FROM channel_members cm2
         JOIN users u2 ON u2.id=cm2.user_id
         WHERE cm2.channel_id=c.id AND cm2.user_id!=$1 AND c.type='direct'
         LIMIT 1) u) AS dm_partner,
      (SELECT row_to_json(lm) FROM (
         SELECT m2.id,m2.content,m2.iv,m2.type,m2.created_at,m2.sender_id
         FROM messages m2 WHERE m2.channel_id=c.id AND m2.is_deleted=false
         ORDER BY m2.created_at DESC LIMIT 1) lm) AS last_message
    FROM channels c
    JOIN channel_members cm ON cm.channel_id=c.id AND cm.user_id=$1
    ORDER BY c.updated_at DESC`, [uid]);
  return reply.send({ channels: r.rows });
};

export const createChannel = async (req, reply) => {
  const { name, description, type='group', memberIds=[] } = req.body;
  const uid = req.user.userId;
  if (!name) return reply.code(400).send({ error: 'Name required' });

  const ch = await query(
    `INSERT INTO channels (name,description,type,created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, description||null, type, uid]
  );
  const channel = ch.rows[0];
  await query(
    'INSERT INTO channel_members (channel_id,user_id,role) VALUES ($1,$2,$3)',
    [channel.id, uid, 'owner']
  );

  const creatorRes = await query('SELECT username FROM users WHERE id=$1', [uid]);
  const creatorName = creatorRes.rows[0]?.username;

  for (const mid of memberIds) {
    if (mid !== uid) {
      await query(
        'INSERT INTO channel_members (channel_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [channel.id, mid, 'member']
      );
      const memberRes = await query(
        'SELECT email,username,is_online FROM users WHERE id=$1', [mid]
      );
      const member = memberRes.rows[0];
      if (member && !member.is_online) {
        sendAddedToGroupEmail({
          toEmail: member.email, toName: member.username,
          addedBy: creatorName, groupName: name, appUrl: APP_URL,
        }).catch(() => {});
      }
    }
  }
  return reply.code(201).send({ channel });
};

export const createDM = async (req, reply) => {
  const { targetUserId } = req.body;
  const uid = req.user.userId;

  const areFriends = await query(
    'SELECT 1 FROM friends WHERE user_id=$1 AND friend_id=$2', [uid, targetUserId]
  );
  if (!areFriends.rows[0]) {
    return reply.code(403).send({
      error: 'You need to be friends first before starting a DM',
      code: 'NOT_FRIENDS'
    });
  }

  const ex = await query(`
    SELECT c.* FROM channels c
    JOIN channel_members a ON a.channel_id=c.id AND a.user_id=$1
    JOIN channel_members b ON b.channel_id=c.id AND b.user_id=$2
    WHERE c.type='direct'`, [uid, targetUserId]);
  if (ex.rows[0]) return reply.send({ channel: ex.rows[0] });

  const ch = await query(
    `INSERT INTO channels (name,type,created_by) VALUES ($1,'direct',$2) RETURNING *`,
    [`dm:${uid}:${targetUserId}`, uid]
  );
  const channel = ch.rows[0];
  await query(
    'INSERT INTO channel_members (channel_id,user_id,role) VALUES ($1,$2,$3)',
    [channel.id, uid, 'member']
  );
  await query(
    'INSERT INTO channel_members (channel_id,user_id,role) VALUES ($1,$2,$3)',
    [channel.id, targetUserId, 'member']
  );

  const senderRes = await query('SELECT username FROM users WHERE id=$1', [uid]);
  const targetRes = await query(
    'SELECT email,username,is_online FROM users WHERE id=$1', [targetUserId]
  );
  const target = targetRes.rows[0];
  if (target && !target.is_online) {
    sendNewDMEmail({
      toEmail: target.email, toName: target.username,
      fromName: senderRes.rows[0]?.username, appUrl: APP_URL,
    }).catch(() => {});
  }
  return reply.code(201).send({ channel });
};

export const getChannelMembers = async (req, reply) => {
  const { channelId } = req.params;
  const uid = req.user.userId;
  const mem = await query(
    'SELECT 1 FROM channel_members WHERE channel_id=$1 AND user_id=$2', [channelId, uid]
  );
  if (!mem.rows[0]) return reply.code(403).send({ error: 'Not a member' });
  const r = await query(`
    SELECT u.id,u.username,u.email,u.avatar_url,u.is_online,u.last_seen,cm.role,cm.joined_at
    FROM channel_members cm JOIN users u ON u.id=cm.user_id
    WHERE cm.channel_id=$1 ORDER BY cm.role,u.username`, [channelId]);
  return reply.send({ members: r.rows });
};

export const addMembers = async (req, reply) => {
  const { channelId } = req.params;
  const { memberIds = [] } = req.body;
  const uid = req.user.userId;

  const myRole = await query(
    'SELECT role FROM channel_members WHERE channel_id=$1 AND user_id=$2',
    [channelId, uid]
  );
  if (!['owner','admin'].includes(myRole.rows[0]?.role))
    return reply.code(403).send({ error: 'Only owner or admin can add members' });

  for (const mid of memberIds) {
    await query(
      'INSERT INTO channel_members (channel_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [channelId, mid, 'member']
    );
  }
  return reply.send({ message: 'Members added successfully' });
};

export const updateMemberRole = async (req, reply) => {
  const { channelId, memberId } = req.params;
  const { role } = req.body;
  const uid = req.user.userId;
  const myRole = await query(
    'SELECT role FROM channel_members WHERE channel_id=$1 AND user_id=$2', [channelId, uid]
  );
  if (!['owner','admin'].includes(myRole.rows[0]?.role))
    return reply.code(403).send({ error: 'Forbidden' });
  await query(
    'UPDATE channel_members SET role=$1 WHERE channel_id=$2 AND user_id=$3',
    [role, channelId, memberId]
  );
  return reply.send({ message: 'Updated' });
};

export const removeMember = async (req, reply) => {
  const { channelId, memberId } = req.params;
  const uid = req.user.userId;
  const myRole = await query(
    'SELECT role FROM channel_members WHERE channel_id=$1 AND user_id=$2', [channelId, uid]
  );
  if (!['owner','admin'].includes(myRole.rows[0]?.role) && uid !== memberId)
    return reply.code(403).send({ error: 'Forbidden' });
  await query(
    'DELETE FROM channel_members WHERE channel_id=$1 AND user_id=$2', [channelId, memberId]
  );
  return reply.send({ message: 'Removed' });
};

export const deleteChat = async (req, reply) => {
  const { channelId } = req.params;
  const uid = req.user.userId;

  const mem = await query(
    'SELECT role FROM channel_members WHERE channel_id=$1 AND user_id=$2',
    [channelId, uid]
  );
  if (!mem.rows[0]) return reply.code(403).send({ error: 'Not a member' });

  const chRes = await query('SELECT type FROM channels WHERE id=$1', [channelId]);
  const isDM  = chRes.rows[0]?.type === 'direct';

  const cleanupAndDelete = async () => {
    await query(
      `DELETE FROM message_receipts WHERE message_id IN
       (SELECT id FROM messages WHERE channel_id=$1)`, [channelId]
    );
    await query(
      `DELETE FROM message_reactions WHERE message_id IN
       (SELECT id FROM messages WHERE channel_id=$1)`, [channelId]
    );
    await query(
      `DELETE FROM starred_messages WHERE message_id IN
       (SELECT id FROM messages WHERE channel_id=$1)`, [channelId]
    );
    await query('DELETE FROM messages WHERE channel_id=$1', [channelId]);
    await query('DELETE FROM channel_members WHERE channel_id=$1', [channelId]);
    await query('DELETE FROM channels WHERE id=$1', [channelId]);
  };

  if (isDM) {
    await cleanupAndDelete();
  } else {
    if (mem.rows[0].role === 'owner') {
      await cleanupAndDelete();
    } else {
      await query(
        'DELETE FROM channel_members WHERE channel_id=$1 AND user_id=$2',
        [channelId, uid]
      );
    }
  }

  return reply.send({ ok: true, channelId });
};