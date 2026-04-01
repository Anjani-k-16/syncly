import { useEffect } from 'react';
import { getSocket } from '../services/socket.js';
import { useChatStore } from '../store/chatStore.js';
import { useFriendStore } from '../store/friendStore.js';

export function useSocket() {
  const { addMessage, updateReceipt, setTyping, setUserOnline } = useChatStore();
  const { addPendingRequest } = useFriendStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewMessage    = (msg) => addMessage(msg);
    const onReceipt       = ({ messageId, channelId, readBy, type }) => {
      if (type === 'read') updateReceipt(messageId, channelId, { readBy });
    };
    const onTypingStart   = ({ userId, channelId }) => setTyping(channelId, userId, true);
    const onTypingStop    = ({ userId, channelId }) => setTyping(channelId, userId, false);
    const onUserStatus    = ({ userId, isOnline }) => setUserOnline(userId, isOnline);
    const onFriendRequest = (data) => addPendingRequest(data);

    socket.on('message:new',     onNewMessage);
    socket.on('message:receipt', onReceipt);
    socket.on('typing:start',    onTypingStart);
    socket.on('typing:stop',     onTypingStop);
    socket.on('user:status',     onUserStatus);
    socket.on('friend:request',  onFriendRequest);

    return () => {
      socket.off('message:new',     onNewMessage);
      socket.off('message:receipt', onReceipt);
      socket.off('typing:start',    onTypingStart);
      socket.off('typing:stop',     onTypingStop);
      socket.off('user:status',     onUserStatus);
      socket.off('friend:request',  onFriendRequest);
    };
  }, []);
}
