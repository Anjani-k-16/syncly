import { create } from 'zustand';
import api from '../services/api.js';
import { connectSocket, disconnectSocket } from '../services/socket.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return set({ loading: false });
    try {
      const { data } = await api.get('/api/auth/me');
      set({ user: data.user, loading: false });
      connectSocket(token);
    } catch {
      localStorage.clear();
      set({ loading: false });
    }
  },

  register: async (username, email, password) => {
    const { data } = await api.post('/api/auth/register', { username, email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user });
    connectSocket(data.accessToken);
    return data;
  },

  login: async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user });
    connectSocket(data.accessToken);
    return data;
  },

  logout: async () => {
    const rt = localStorage.getItem('refreshToken');
    await api.post('/api/auth/logout', { refreshToken: rt }).catch(() => {});
    localStorage.clear();
    disconnectSocket();
    set({ user: null });
  },
}));
