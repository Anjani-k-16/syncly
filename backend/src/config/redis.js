import Redis from 'ioredis';

const opts = { lazyConnect: true, maxRetriesPerRequest: 3 };

export const redis    = new Redis(process.env.REDIS_URL, opts);
export const redisPub = new Redis(process.env.REDIS_URL, opts);
export const redisSub = new Redis(process.env.REDIS_URL, opts);

[redis, redisPub, redisSub].forEach((r, i) =>
  r.on('error', (e) => console.error(`Redis[${i}] error`, e))
);

export const checkRateLimit = async (key, limit, windowSecs) => {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSecs);
  return { allowed: count <= limit, count };
};
