import { query } from '../config/database.js';
import { sendDailyDigestEmail } from './emailService.js';

export async function sendDailyDigests() {
  console.log('[digest] Starting daily digest job...');
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const usersResult = await query(`
    SELECT DISTINCT u.id, u.username, u.email
    FROM users u
    WHERE u.is_online = false
      AND u.last_seen < NOW() - INTERVAL '1 hour'
  `);

  for (const user of usersResult.rows) {
    try {
      const missedResult = await query(`
        SELECT
          CASE WHEN c.type = 'direct' THEN
            (SELECT username FROM users WHERE id = (
              SELECT user_id FROM channel_members
              WHERE channel_id = c.id AND user_id != $1 LIMIT 1
            ))
          ELSE c.name END as name,
          COUNT(m.id)::int as count,
          (SELECT content FROM messages
           WHERE channel_id = c.id AND is_deleted = false
           ORDER BY created_at DESC LIMIT 1) as last_content
        FROM channels c
        JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = $1
        JOIN messages m ON m.channel_id = c.id
          AND m.sender_id != $1
          AND m.created_at > NOW() - INTERVAL '24 hours'
          AND m.is_deleted = false
        LEFT JOIN message_receipts mr ON mr.message_id = m.id AND mr.user_id = $1
        WHERE mr.read_at IS NULL OR mr.id IS NULL
        GROUP BY c.id, c.name, c.type
        HAVING COUNT(m.id) > 0
        ORDER BY count DESC
        LIMIT 10
      `, [user.id]);

      if (missedResult.rows.length === 0) continue;

      const missedMessages = missedResult.rows.map(r => ({
        name: r.name || 'Unknown',
        count: r.count,
        lastMessage: r.last_content
          ? (r.last_content.slice(0, 50) + (r.last_content.length > 50 ? '…' : ''))
          : '📎 Media',
      }));

      await sendDailyDigestEmail({
        toEmail: user.email,
        toName: user.username,
        missedMessages,
        appUrl,
      });
    } catch (err) {
      console.error(`[digest] Failed for user ${user.id}:`, err.message);
    }
  }

  console.log(`[digest] Done. Processed ${usersResult.rows.length} users.`);
}

export function scheduleDailyDigest() {
  const now = new Date();
  const next9AM = new Date();
  next9AM.setHours(9, 0, 0, 0);
  if (next9AM <= now) next9AM.setDate(next9AM.getDate() + 1);
  const msUntil9AM = next9AM - now;
  console.log(`[digest] First digest scheduled in ${Math.round(msUntil9AM / 3600000)}h`);
  setTimeout(() => {
    sendDailyDigests();
    setInterval(sendDailyDigests, 24 * 60 * 60 * 1000);
  }, msUntil9AM);
}