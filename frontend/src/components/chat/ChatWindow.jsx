import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Hash, Lock, Users, ChevronDown, Loader2, X, Trash2,
         MoreVertical, Reply, Star, Share2, CheckCheck, UserPlus } from 'lucide-react';
import { useChatStore } from '../../store/chatStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { getSocket } from '../../services/socket.js';
import MessageBubble from './MessageBubble.jsx';
import MessageInput from './MessageInput.jsx';
import Avatar from '../ui/Avatar.jsx';
import AddMembersModal from '../ui/AddMembersModal.jsx';
import api from '../../services/api.js';

export default function ChatWindow() {
  const { activeChannel, messages, fetchMessages, typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const bottomRef    = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading]             = useState(false);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [hasMore, setHasMore]             = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [members, setMembers]             = useState([]);
  const [showMembers, setShowMembers]     = useState(false);
  const [replyTo, setReplyTo]             = useState(null);
  const [showMenu, setShowMenu]           = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [showAddMembers, setShowAddMembers] = useState(false);

  const socket    = getSocket();
  const channelId = activeChannel?.id;
  const msgs      = messages[channelId] || [];
  const typing    = typingUsers[channelId] || new Set();
  const typingList = [...typing].filter(id => id !== user?.id);

  useEffect(() => {
    if (!channelId) return;
    setLoading(true); setReplyTo(null);
    setSelectionMode(false); setSelectedIds(new Set());
    fetchMessages(channelId).then((d) => {
      setHasMore(d.hasMore); setLoading(false); scrollBottom();
    });
    socket?.emit('channel:join', { channelId });
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;
    api.post(`/api/channels/${channelId}/messages/read`).catch(() => {});
    const ids = msgs.filter(m => m.sender_id !== user?.id).map(m => m.id);
    if (ids.length) socket?.emit('message:read', { channelId, messageIds: ids });
  }, [channelId, msgs.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) scrollBottom(); else setShowScrollBtn(true);
  }, [msgs.length]);

  useEffect(() => {
    if (!socket) return;
    const onDeleted = ({ messageIds }) => {
      useChatStore.setState(s => ({
        messages: {
          ...s.messages,
          [channelId]: (s.messages[channelId] || []).map(m =>
            messageIds.includes(m.id) ? { ...m, is_deleted: true, content: null } : m
          ),
        },
      }));
    };
    socket.on('messages:deleted', onDeleted);
    return () => socket.off('messages:deleted', onDeleted);
  }, [socket, channelId]);

  const scrollBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    setShowScrollBtn(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !msgs[0]) return;
    setLoadingMore(true);
    const el = containerRef.current;
    const prevH = el.scrollHeight;
    const d = await fetchMessages(channelId, msgs[0].id);
    setHasMore(d.hasMore); setLoadingMore(false);
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prevH; });
  };

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop < 80) loadMore();
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  }, [loadingMore, hasMore, msgs]);

  const fetchMembers = async () => {
    try {
      const { data } = await api.get(`/api/channels/${channelId}/members`);
      setMembers(data.members);
    } catch {}
  };

  const handleSelect = (msgId, enterMode = false) => {
    if (enterMode) {
      setSelectionMode(true);
      setSelectedIds(new Set([msgId]));
      return;
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(msgId) ? next.delete(msgId) : next.add(msgId);
      return next;
    });
  };

  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };
  const selectAll = () => setSelectedIds(new Set(msgs.filter(m => !m.is_deleted).map(m => m.id)));

  const deleteSelected = () => {
    if (!window.confirm(`Delete ${selectedIds.size} message${selectedIds.size > 1 ? 's' : ''}?`)) return;
    socket?.emit('messages:delete', { messageIds: [...selectedIds], channelId }, (res) => {
      if (res?.ok) exitSelection();
    });
  };

  const copySelected = () => {
    const text = msgs
      .filter(m => selectedIds.has(m.id) && m.content)
      .map(m => `${m.sender?.username}: ${m.content}`)
      .join('\n');
    if (text) navigator.clipboard.writeText(text);
    exitSelection();
  };

  const starSelected = () => {
    [...selectedIds].forEach(msgId => socket?.emit('message:star', { messageId: msgId }));
    exitSelection();
  };

  const replySelected = () => {
    const first = msgs.find(m => selectedIds.has(m.id));
    if (first) setReplyTo(first);
    exitSelection();
  };

  const forwardSelected = () => {
    const text = msgs.filter(m => selectedIds.has(m.id) && m.content).map(m => m.content).join('\n');
    if (text) navigator.clipboard.writeText(text);
    alert(`${selectedIds.size} message(s) copied — paste in any chat to forward!`);
    exitSelection();
  };

  const handleDeleteChat = async () => {
    const isDM = activeChannel.type === 'direct';
    if (!window.confirm(isDM
      ? 'Delete this entire conversation? All messages will be permanently deleted.'
      : 'Leave/delete this group?')) return;
    try {
      await api.delete(`/api/channels/${channelId}`);
      useChatStore.setState(s => ({
        channels: s.channels.filter(c => c.id !== channelId),
        messages: { ...s.messages, [channelId]: undefined },
        activeChannel: null,
      }));
      setShowMenu(false);
    } catch (e) { console.error(e); }
  };

  if (!activeChannel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-void">
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-panel border border-border
            flex items-center justify-center mx-auto mb-4">
            <Hash size={24} className="text-dim" />
          </div>
          <h2 className="font-display font-700 text-text text-xl mb-2">Welcome to Syncly</h2>
          <p className="text-dim font-body text-sm max-w-xs">
            Select a conversation to start messaging.
          </p>
        </div>
      </div>
    );
  }

  const isDM    = activeChannel.type === 'direct';
  const name    = isDM ? activeChannel.dm_partner?.username : activeChannel.name;
  const partner = activeChannel.dm_partner;

  return (
    <div className="flex-1 flex flex-col bg-void overflow-hidden">

      {selectionMode ? (
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border
          bg-surface flex-shrink-0 animate-fade-in">
          <button onClick={exitSelection} className="text-dim hover:text-text transition-colors">
            <X size={18} />
          </button>
          <span className="font-display font-600 text-text flex-1">
            {selectedIds.size} selected
          </span>
          <button onClick={selectAll}
            className="text-xs font-display font-600 text-accent hover:text-accentDim transition-colors px-2">
            Select All
          </button>
          <div className="flex items-center gap-1">
            <button onClick={replySelected} disabled={selectedIds.size !== 1}
              title="Reply"
              className="p-2 rounded-xl text-dim hover:text-accent hover:bg-accent/10
                transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <Reply size={16} />
            </button>
            <button onClick={copySelected} title="Copy"
              className="p-2 rounded-xl text-dim hover:text-accent hover:bg-accent/10 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button onClick={starSelected} title="Star"
              className="p-2 rounded-xl text-dim hover:text-gold hover:bg-gold/10 transition-all">
              <Star size={16} />
            </button>
            <button onClick={forwardSelected} title="Forward"
              className="p-2 rounded-xl text-dim hover:text-accent hover:bg-accent/10 transition-all">
              <Share2 size={16} />
            </button>
            <button onClick={deleteSelected} title="Delete"
              className="p-2 rounded-xl text-dim hover:text-pulse hover:bg-pulse/10 transition-all">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-[9999] flex items-center gap-3 px-5 py-3.5 border-b border-border
          bg-panel/50 backdrop-blur-sm flex-shrink-0">
          {isDM ? (
            <Avatar user={partner} size="md" showOnline />
          ) : (
            <div className="w-9 h-9 rounded-full bg-surface border border-border
              flex items-center justify-center flex-shrink-0">
              {activeChannel.type === 'public'
                ? <Hash size={16} className="text-dim" />
                : <Lock size={14} className="text-dim" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-700 text-text text-base leading-tight">{name}</h2>
            <p className="text-[11px] font-mono text-dim">
              {isDM
                ? (partner?.is_online ? '● Online' : '○ Offline')
                : `${activeChannel.member_count || 0} members · ${activeChannel.type}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isDM && (
              <button
                onClick={() => { setShowMembers(p => !p); if (!showMembers) fetchMembers(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                  text-xs font-display font-600 transition-all
                  ${showMembers
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-surface border-border text-dim hover:text-text'}`}>
                <Users size={13} /> Members
              </button>
            )}
            <div className="relative z-[9999]">
              <button onClick={() => setShowMenu(p => !p)}
                className="p-1.5 text-dim hover:text-text transition-colors rounded-lg hover:bg-surface">
                <MoreVertical size={16} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-10 bg-panel border border-border
                  rounded-xl shadow-xl z-[9999] overflow-visible animate-fade-in w-52">
                  {!isDM && (
                    <button
                      onClick={() => { setShowAddMembers(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-body
                        text-text hover:bg-surface transition-colors text-left">
                      <UserPlus size={14} /> Add Members
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectionMode(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-body
                      text-text hover:bg-surface transition-colors text-left">
                    <CheckCheck size={14} /> Select Messages
                  </button>
                  <button onClick={handleDeleteChat}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-body
                      text-pulse hover:bg-pulse/10 transition-colors text-left border-t border-border">
                    <Trash2 size={14} />
                    {isDM ? 'Delete Entire Chat' : 'Leave / Delete Group'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative z-0">
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div ref={containerRef} onScroll={handleScroll}
            className="flex-1 overflow-y-auto py-4 space-y-0.5 relative z-0"
            onClick={() => setShowMenu(false)}>

            {loadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 size={16} className="text-dim animate-spin" />
              </div>
            )}
            {hasMore && !loadingMore && (
              <button onClick={loadMore}
                className="flex justify-center w-full py-2 text-xs text-dim
                  hover:text-accent font-display font-600 transition-colors">
                Load older messages
              </button>
            )}
            {loading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={20} className="text-dim animate-spin" />
              </div>
            )}
            {!loading && msgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-panel border border-border
                  flex items-center justify-center mb-3">
                  {isDM ? <Avatar user={partner} size="md" /> : <Hash size={18} className="text-dim" />}
                </div>
                <p className="font-display font-600 text-text mb-1">
                  {isDM ? `Start chatting with ${name}` : `Welcome to #${name}`}
                </p>
                <p className="text-dim text-sm font-body">Messages are end-to-end encrypted.</p>
              </div>
            )}

            {msgs.map((msg, i) => (
              <MessageBubble
                key={msg.id} msg={msg} prevMsg={msgs[i - 1]}
                selectionMode={selectionMode}
                selected={selectedIds.has(msg.id)}
                onSelect={handleSelect}
                onReply={(m) => { setReplyTo(m); exitSelection(); }}
                onDelete={(id) => useChatStore.setState(s => ({
                  messages: {
                    ...s.messages,
                    [channelId]: s.messages[channelId].filter(m => m.id !== id)
                  }
                }))}
              />
            ))}

            {typingList.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-1">
                <div className="bg-panel border border-border rounded-2xl px-3 py-2
                  flex items-center gap-1.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="text-xs text-dim font-body ml-1">
                    {typingList.length === 1 ? 'Someone is typing' : 'Several people are typing'}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {showScrollBtn && (
            <button onClick={scrollBottom}
              className="absolute bottom-24 right-6 bg-accent text-void rounded-full p-2
                shadow-lg hover:bg-accentDim transition-all animate-fade-in glow-accent">
              <ChevronDown size={16} />
            </button>
          )}

          {replyTo && !selectionMode && (
            <div className="mx-4 mb-2 flex items-center gap-3 bg-surface border border-accent/30
              rounded-xl px-3 py-2 animate-fade-in">
              <div className="w-1 h-8 bg-accent rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-display font-600 text-accent">
                  Replying to {replyTo.sender?.username}
                </p>
                <p className="text-xs text-dim font-body truncate">
                  {replyTo.content || '📎 Media'}
                </p>
              </div>
              <button onClick={() => setReplyTo(null)}
                className="text-dim hover:text-text transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          {!selectionMode && (
            <MessageInput
              channelId={channelId}
              replyTo={replyTo}
              onReplySent={() => setReplyTo(null)}
            />
          )}

          {selectionMode && (
            <div className="px-4 py-3 border-t border-border bg-surface/50 text-center animate-fade-in">
              <p className="text-xs text-dim font-body">
                Long press any message to select · Tap to toggle selection
              </p>
            </div>
          )}
        </div>

        {showMembers && !isDM && (
          <div className="w-56 border-l border-border bg-panel flex-shrink-0
            overflow-y-auto p-3 animate-slide-in absolute right-0 bottom-0 top-[57px] z-10">
            <p className="text-xs font-display font-700 text-dim uppercase tracking-widest mb-3 px-2">
              Members
            </p>
            <div className="space-y-1">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2.5 px-2 py-2
                  rounded-xl hover:bg-surface transition-all">
                  <Avatar user={m} size="sm" showOnline />
                  <div className="min-w-0">
                    <p className="text-xs font-display font-600 text-text truncate">{m.username}</p>
                    <p className={`text-[10px] font-mono capitalize
                      ${m.role === 'owner' ? 'text-gold'
                        : m.role === 'admin' ? 'text-accent' : 'text-dim'}`}>
                      {m.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddMembers && (
        <AddMembersModal
          channelId={channelId}
          channelName={name}
          onClose={() => { setShowAddMembers(false); fetchMembers(); }}
        />
      )}
    </div>
  );
}