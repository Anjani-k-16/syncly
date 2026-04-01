import { query } from '../config/database.js';
import { sendEmail } from '../services/emailService.js';

const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

let _io = null;
export function setIO(io) { _io = io; }

export const sendRequest = async (req, reply) => {
  const { targetUserId } = req.body;
  const uid = req.user.userId;

  if (targetUserId === uid)
    return reply.code(400).send({ error: "Can't add yourself" });

  const alreadyFriends = await query(
    'SELECT 1 FROM friends WHERE user_id=$1 AND friend_id=$2', [uid, targetUserId]
  );
  if (alreadyFriends.rows[0])
    return reply.code(409).send({ error: 'Already friends' });

  const existing = await query(
    'SELECT * FROM friend_requests WHERE from_user=$1 AND to_user=$2', [uid, targetUserId]
  );
  if (existing.rows[0]) {
    if (existing.rows[0].status === 'pending')
      return reply.code(409).send({ error: 'Request already sent' });
    await query(
      'DELETE FROM friend_requests WHERE from_user=$1 AND to_user=$2',
      [uid, targetUserId]
    );
  }
  const reverse = await query(
    'SELECT * FROM friend_requests WHERE from_user=$1 AND to_user=$2 AND status=$3',
    [targetUserId, uid, 'pending']
  );
  if (reverse.rows[0]) {
    await query(
      'UPDATE friend_requests SET status=$1 WHERE id=$2',
      ['accepted', reverse.rows[0].id]
    );
    await query(
      'INSERT INTO friends (user_id,friend_id) VALUES ($1,$2),($2,$1) ON CONFLICT DO NOTHING',
      [uid, targetUserId]
    );
    if (_io) {
      _io.to(`user:${uid}`).emit('friend:accepted', { userId: targetUserId });
      _io.to(`user:${targetUserId}`).emit('friend:accepted', { userId: uid });
    }
    return reply.send({ message: 'You are now friends!', status: 'accepted' });
  }

  const reqResult = await query(
    'INSERT INTO friend_requests (from_user, to_user) VALUES ($1,$2) RETURNING *',
    [uid, targetUserId]
  );
  const newRequest = reqResult.rows[0];

  const senderR = await query(
    'SELECT id, username, avatar_url, is_online FROM users WHERE id=$1', [uid]
  );
  const sender = senderR.rows[0];

  const targetR = await query(
    'SELECT email, username, is_online FROM users WHERE id=$1', [targetUserId]
  );
  const target = targetR.rows[0];

  if (_io) {
    _io.to(`user:${targetUserId}`).emit('friend:request', {
      id: newRequest.id,
      from_user: {
        id: sender.id,
        username: sender.username,
        avatar_url: sender.avatar_url,
        is_online: sender.is_online,
      },
      created_at: newRequest.created_at,
    });
  }

  if (target) {
    sendEmail({
      to: target.email,
      subject: `👋 ${sender.username} sent you a friend request on Syncly`,
      html: `
        <!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <style>
          body{background:#080A0F;font-family:Arial,sans-serif;color:#E8EDF5;margin:0;padding:20px}
          .c{max-width:500px;margin:0 auto;background:#0E1117;border:1px solid #1E2433;border-radius:20px;overflow:hidden}
          .h{padding:24px 32px;border-bottom:1px solid #1E2433;text-align:center;font-size:22px;font-weight:700}
          .b{padding:32px;text-align:center}
          .av{width:64px;height:64px;border-radius:50%;background:#00D4FF;font-size:28px;font-weight:700;color:#080A0F;margin:0 auto 16px;line-height:64px;text-align:center}
          .btn{display:block;width:fit-content;margin:24px auto;background:#00D4FF;color:#080A0F;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700}
          .f{padding:16px 32px;border-top:1px solid #1E2433;text-align:center;font-size:11px;color:#7A8BA5}
        </style></head>
        <body><div class="c">
          <div class="h">Sync<span style="color:#00D4FF">ly</span></div>
          <div class="b">
            <div class="av">${sender.username[0].toUpperCase()}</div>
            <p style="font-size:18px;font-weight:700;margin-bottom:8px">
              ${sender.username} wants to be your friend!
            </p>
            <p style="color:#7A8BA5;font-size:14px">
              <strong style="color:#00D4FF">${sender.username}</strong>
              sent you a friend request on Syncly. Accept it to start chatting!
            </p>
            <a href="${APP_URL}" class="btn">View Friend Request →</a>
            <p style="color:#7A8BA5;font-size:12px;margin-top:16px">
              Open Syncly → click the 👥 icon → go to Requests tab
            </p>
          </div>
          <div class="f">Syncly · Real-time encrypted messaging</div>
        </div></body></html>
      `,
    }).catch(err => console.error('[email] friend request failed:', err.message));
  }

  return reply.send({ message: 'Friend request sent!', status: 'pending' });
};

export const respondRequest = async (req, reply) => {
  const { requestId } = req.params;
  const { action } = req.body;
  const uid = req.user.userId;

  const r = await query(
    'SELECT * FROM friend_requests WHERE id=$1 AND to_user=$2 AND status=$3',
    [requestId, uid, 'pending']
  );
  if (!r.rows[0]) return reply.code(404).send({ error: 'Request not found' });

  if (action === 'accept') {
    await query(
      'UPDATE friend_requests SET status=$1, updated_at=NOW() WHERE id=$2',
      ['accepted', requestId]
    );
    await query(
      'INSERT INTO friends (user_id,friend_id) VALUES ($1,$2),($2,$1) ON CONFLICT DO NOTHING',
      [uid, r.rows[0].from_user]
    );

    if (_io) {
      _io.to(`user:${uid}`).emit('friend:accepted', { userId: r.rows[0].from_user });
      _io.to(`user:${r.rows[0].from_user}`).emit('friend:accepted', { userId: uid });
    }

    const acceptorR = await query('SELECT username FROM users WHERE id=$1', [uid]);
    const senderR   = await query(
      'SELECT email, username FROM users WHERE id=$1', [r.rows[0].from_user]
    );
    if (senderR.rows[0]) {
      sendEmail({
        to: senderR.rows[0].email,
        subject: `🎉 ${acceptorR.rows[0]?.username} accepted your friend request on Syncly!`,
        html: `
          <!DOCTYPE html><html><head><meta charset="UTF-8"/>
          <style>
            body{background:#080A0F;font-family:Arial,sans-serif;color:#E8EDF5;margin:0;padding:20px}
            .c{max-width:500px;margin:0 auto;background:#0E1117;border:1px solid #1E2433;border-radius:20px;overflow:hidden}
            .h{padding:24px 32px;border-bottom:1px solid #1E2433;text-align:center;font-size:22px;font-weight:700}
            .b{padding:32px;text-align:center}
            .btn{display:block;width:fit-content;margin:24px auto;background:#00D4FF;color:#080A0F;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700}
            .f{padding:16px 32px;border-top:1px solid #1E2433;text-align:center;font-size:11px;color:#7A8BA5}
          </style></head>
          <body><div class="c">
            <div class="h">Sync<span style="color:#00D4FF">ly</span></div>
            <div class="b">
              <div style="font-size:48px;margin-bottom:16px">🎉</div>
              <p style="font-size:18px;font-weight:700;margin-bottom:8px">
                You're now friends with ${acceptorR.rows[0]?.username}!
              </p>
              <p style="color:#7A8BA5;font-size:14px">
                <strong style="color:#00D4FF">${acceptorR.rows[0]?.username}</strong>
                accepted your friend request. You can now chat on Syncly!
              </p>
              <a href="${APP_URL}" class="btn">Start Chatting →</a>
            </div>
            <div class="f">Syncly · Real-time encrypted messaging</div>
          </div></body></html>
        `,
      }).catch(() => {});
    }

    return reply.send({ message: 'Friend request accepted!' });
  } else {
    await query(
      'UPDATE friend_requests SET status=$1, updated_at=NOW() WHERE id=$2',
      ['declined', requestId]
    );
    return reply.send({ message: 'Friend request declined' });
  }
};

export const getPendingRequests = async (req, reply) => {
  const uid = req.user.userId;
  const r = await query(`
    SELECT fr.id, fr.created_at,
      json_build_object(
        'id',u.id,'username',u.username,
        'avatar_url',u.avatar_url,'is_online',u.is_online
      ) as from_user
    FROM friend_requests fr
    JOIN users u ON u.id=fr.from_user
    WHERE fr.to_user=$1 AND fr.status='pending'
    ORDER BY fr.created_at DESC
  `, [uid]);
  return reply.send({ requests: r.rows });
};

export const getFriends = async (req, reply) => {
  const uid = req.user.userId;
  const r = await query(`
    SELECT u.id, u.username, u.avatar_url, u.is_online, u.last_seen
    FROM friends f
    JOIN users u ON u.id=f.friend_id
    WHERE f.user_id=$1
    ORDER BY u.is_online DESC, u.username ASC
  `, [uid]);
  return reply.send({ friends: r.rows });
};

export const removeFriend = async (req, reply) => {
  const { friendId } = req.params;
  const uid = req.user.userId;
  await query(
    'DELETE FROM friends WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)',
    [uid, friendId]
  );
  await query(
    'DELETE FROM friend_requests WHERE (from_user=$1 AND to_user=$2) OR (from_user=$2 AND to_user=$1)',
    [uid, friendId]
  );
  return reply.send({ message: 'Friend removed' });
};

export const getFriendStatus = async (req, reply) => {
  const { userId } = req.params;
  const uid = req.user.userId;

  const friends = await query(
    'SELECT 1 FROM friends WHERE user_id=$1 AND friend_id=$2', [uid, userId]
  );
  if (friends.rows[0]) return reply.send({ status: 'friends' });

  const sent = await query(
    'SELECT id FROM friend_requests WHERE from_user=$1 AND to_user=$2 AND status=$3',
    [uid, userId, 'pending']
  );
  if (sent.rows[0]) return reply.send({ status: 'pending_sent' });

  const received = await query(
    'SELECT id FROM friend_requests WHERE from_user=$1 AND to_user=$2 AND status=$3',
    [userId, uid, 'pending']
  );
  if (received.rows[0])
    return reply.send({ status: 'pending_received', requestId: received.rows[0].id });

  return reply.send({ status: 'none' });
};