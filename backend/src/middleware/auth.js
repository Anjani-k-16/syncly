import jwt from 'jsonwebtoken';

export const signAccess  = (p) => jwt.sign(p, process.env.JWT_ACCESS_SECRET,  { expiresIn: process.env.JWT_ACCESS_EXPIRES  || '15m' });
export const signRefresh = (p) => jwt.sign(p, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'  });
export const verifyAccess  = (t) => jwt.verify(t, process.env.JWT_ACCESS_SECRET);
export const verifyRefresh = (t) => jwt.verify(t, process.env.JWT_REFRESH_SECRET);

export async function authenticate(req, reply) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return reply.code(401).send({ error: 'Missing token' });
  try { req.user = verifyAccess(h.slice(7)); }
  catch { return reply.code(401).send({ error: 'Invalid or expired token' }); }
}

export function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try { socket.user = verifyAccess(token); next(); }
  catch { next(new Error('Invalid token')); }
}
