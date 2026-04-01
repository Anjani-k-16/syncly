import { authenticate } from '../middleware/auth.js';
import * as auth     from '../controllers/authController.js';
import * as channel  from '../controllers/channelController.js';
import * as message  from '../controllers/messageController.js';
import * as reaction from '../controllers/reactionController.js';
import * as user     from '../controllers/userController.js';
import * as friend   from '../controllers/friendController.js';
import { uploadMedia } from '../controllers/uploadController.js';
import { query } from '../config/database.js';

export async function registerRoutes(app) {
  app.post('/api/auth/send-otp',        auth.sendOTP);
  app.post('/api/auth/verify-otp',      auth.verifyOTP);
  app.post('/api/auth/register',        auth.register);
  app.post('/api/auth/login',           auth.login);
  app.post('/api/auth/refresh',         auth.refresh);
  app.post('/api/auth/logout',          { preHandler:[authenticate] }, auth.logout);
  app.get ('/api/auth/me',              { preHandler:[authenticate] }, auth.getMe);
  app.post('/api/auth/forgot-password', auth.forgotPassword);
  app.post('/api/auth/reset-password',  auth.resetPassword);

  app.get('/api/users/search', { preHandler:[authenticate] }, async (req, reply) => {
    const { q } = req.query;
    if (!q || q.length < 2) return reply.code(400).send({ error: 'Query too short' });
    const uid = req.user.userId;
    const r = await query(
      `SELECT u.id, u.username, u.avatar_url, u.is_online,
        CASE WHEN f.id IS NOT NULL THEN 'friends'
             WHEN fr_sent.id IS NOT NULL THEN 'pending_sent'
             WHEN fr_recv.id IS NOT NULL THEN 'pending_received'
             ELSE 'none' END as friend_status,
        fr_recv.id as request_id
       FROM users u
       LEFT JOIN friends f ON f.user_id=$1 AND f.friend_id=u.id
       LEFT JOIN friend_requests fr_sent ON fr_sent.from_user=$1 AND fr_sent.to_user=u.id AND fr_sent.status='pending'
       LEFT JOIN friend_requests fr_recv ON fr_recv.from_user=u.id AND fr_recv.to_user=$1 AND fr_recv.status='pending'
       WHERE u.username ILIKE $2 AND u.id != $1
       LIMIT 20`,
      [uid, `%${q}%`]
    );
    return reply.send({ users: r.rows });
  });
  app.get ('/api/users/:userId',   { preHandler:[authenticate] }, user.getProfile);
  app.put ('/api/users/profile',   { preHandler:[authenticate] }, user.updateProfile);
  app.post('/api/users/avatar',    { preHandler:[authenticate] }, user.uploadAvatar);

  app.get   ('/api/friends',                     { preHandler:[authenticate] }, friend.getFriends);
  app.get   ('/api/friends/requests',            { preHandler:[authenticate] }, friend.getPendingRequests);
  app.post  ('/api/friends/request',             { preHandler:[authenticate] }, friend.sendRequest);
  app.put   ('/api/friends/requests/:requestId', { preHandler:[authenticate] }, friend.respondRequest);
  app.delete('/api/friends/:friendId',           { preHandler:[authenticate] }, friend.removeFriend);
  app.get   ('/api/friends/status/:userId',      { preHandler:[authenticate] }, friend.getFriendStatus);

  app.get   ('/api/channels',                                   { preHandler:[authenticate] }, channel.getMyChannels);
  app.post  ('/api/channels',                                   { preHandler:[authenticate] }, channel.createChannel);
  app.post  ('/api/channels/dm',                                { preHandler:[authenticate] }, channel.createDM);
  app.delete('/api/channels/:channelId',                        { preHandler:[authenticate] }, channel.deleteChat);
  app.get   ('/api/channels/:channelId/members',                { preHandler:[authenticate] }, channel.getChannelMembers);
  app.post  ('/api/channels/:channelId/members',                { preHandler:[authenticate] }, channel.addMembers);
  app.put   ('/api/channels/:channelId/members/:memberId/role', { preHandler:[authenticate] }, channel.updateMemberRole);
  app.delete('/api/channels/:channelId/members/:memberId',      { preHandler:[authenticate] }, channel.removeMember);

  app.get   ('/api/channels/:channelId/messages',      { preHandler:[authenticate] }, message.getMessages);
  app.post  ('/api/channels/:channelId/messages/read', { preHandler:[authenticate] }, message.markRead);
  app.delete('/api/messages/:messageId',               { preHandler:[authenticate] }, message.deleteMessage);

  app.post('/api/messages/:messageId/reactions', { preHandler:[authenticate] }, reaction.toggleReaction);
  app.get ('/api/messages/:messageId/reactions', { preHandler:[authenticate] }, reaction.getReactions);

  app.post('/api/upload', { preHandler:[authenticate] }, uploadMedia);

  app.get('/health', async () => ({ status:'ok', ts: new Date() }));
}