import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

let socket = null;

export function getSocket() { return socket; }

export function connectSocket(token) {
  if (socket?.connected) return socket;
  socket = io(WS_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  socket.on('connect', () => console.log('[socket] connected', socket.id));
  socket.on('connect_error', (e) => console.error('[socket] error', e.message));
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}