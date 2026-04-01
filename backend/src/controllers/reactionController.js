import { query } from '../config/database.js';

export const toggleReaction = async (req, reply) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user.userId;

  if (!emoji) return reply.code(400).send({ error: 'Emoji required' });

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

  const reactions = await getMessageReactions(messageId);
  return reply.send({ reactions, messageId });
};

export const getReactions = async (req, reply) => {
  const { messageId } = req.params;
  const reactions = await getMessageReactions(messageId);
  return reply.send({ reactions });
};

export async function getMessageReactions(messageId) {
  const r = await query(`
    SELECT emoji, COUNT(*)::int as count,
      json_agg(json_build_object('id',u.id,'username',u.username)) as users
    FROM message_reactions mr
    JOIN users u ON u.id=mr.user_id
    WHERE mr.message_id=$1
    GROUP BY emoji ORDER BY count DESC
  `, [messageId]);
  return r.rows;
}