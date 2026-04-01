import { create } from 'zustand';
import api from '../services/api.js';

export const useChatStore = create((set, get) => ({
  channels: [],
  activeChannel: null,
  messages: {},
  typingUsers: {},
  onlineUsers: {},
  unreadCounts: {},

  fetchChannels: async () => {
    const { data } = await api.get('/api/channels');
    set({ channels: data.channels });
  },

  setActiveChannel: (channel) => {
    set((s) => ({
      activeChannel: channel,
      unreadCounts: { ...s.unreadCounts, [channel?.id]: 0 },
    }));
  },

  addChannel: (channel) =>
    set((s) => ({ channels: [channel, ...s.channels.filter(c => c.id !== channel.id)] })),

  fetchMessages: async (channelId, before = null) => {
    const params = { limit: 50 };
    if (before) params.before = before;
    const { data } = await api.get(`/api/channels/${channelId}/messages`, { params });
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: before
          ? [...data.messages, ...(s.messages[channelId] || [])]
          : data.messages,
      },
    }));
    return data;
  },

  addMessage: (msg) =>
    set((s) => {
      const existing = s.messages[msg.channel_id] || [];
      if (existing.find(m => m.id === msg.id)) return s;
      const updated = [...existing, msg];

      const channelExists = s.channels.find(c => c.id === msg.channel_id);

      let channels;
      if (channelExists) {
        channels = s.channels.map(c =>
          c.id === msg.channel_id
            ? { ...c, last_message: msg, updated_at: msg.created_at }
            : c
        ).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      } else {
        api.get('/api/channels').then(({ data }) => {
          const newChannel = data.channels.find(c => c.id === msg.channel_id);
          if (newChannel) {
            set((prev) => ({
              channels: [
                { ...newChannel, last_message: msg, updated_at: msg.created_at },
                ...prev.channels.filter(c => c.id !== msg.channel_id),
              ],
            }));
          }
        });
        channels = s.channels;
      }

      const isActive = s.activeChannel?.id === msg.channel_id;
      const unreadCounts = isActive
        ? s.unreadCounts
        : { ...s.unreadCounts, [msg.channel_id]: (s.unreadCounts[msg.channel_id] || 0) + 1 };

      return {
        messages: { ...s.messages, [msg.channel_id]: updated },
        channels,
        unreadCounts,
      };
    }),

  updateReceipt: (messageId, channelId, update) =>
    set((s) => {
      const msgs = (s.messages[channelId] || []).map(m => {
        if (m.id !== messageId) return m;
        const receipts = m.receipts || [];
        const exists = receipts.find(r => r.user_id === update.readBy);
        if (exists) return { ...m, receipts: receipts.map(r => r.user_id === update.readBy ? { ...r, read_at: new Date().toISOString() } : r) };
        return { ...m, receipts: [...receipts, { user_id: update.readBy, read_at: new Date().toISOString() }] };
      });
      return { messages: { ...s.messages, [channelId]: msgs } };
    }),

  setTyping: (channelId, userId, isTyping) =>
    set((s) => {
      const current = new Set(s.typingUsers[channelId] || []);
      isTyping ? current.add(userId) : current.delete(userId);
      return { typingUsers: { ...s.typingUsers, [channelId]: current } };
    }),

  setUserOnline: (userId, isOnline) =>
    set((s) => ({
      onlineUsers: { ...s.onlineUsers, [userId]: isOnline },
      channels: s.channels.map(c =>
        c.dm_partner?.id === userId
          ? { ...c, dm_partner: { ...c.dm_partner, is_online: isOnline } }
          : c
      ),
    })),
}));