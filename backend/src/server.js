import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { redis } from './config/redis.js';
import { registerRoutes } from './routes/index.js';
import { initSocket } from './services/socketService.js';
import { verifyEmailConnection } from './services/emailService.js';
import { scheduleDailyDigest } from './services/digestService.js';
import { setIO } from './controllers/friendController.js';
import { runMigrations } from './config/database.js';

const app = Fastify({ logger: true, trustProxy: true });

await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
await app.register(rateLimit, {
  global: true, max: 200, timeWindow: '1 minute', redis,
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
});

await runMigrations();
await registerRoutes(app);

const PORT = parseInt(process.env.PORT || '4000');
await app.listen({ port: PORT, host: '0.0.0.0' });

const io = initSocket(app.server);
setIO(io);

await verifyEmailConnection();
scheduleDailyDigest();

console.log(`\n⚡ Syncly backend on :${PORT}\n`);