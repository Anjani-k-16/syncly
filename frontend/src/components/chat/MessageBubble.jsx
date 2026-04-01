import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, FileText, ExternalLink, X, Reply, Star } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import Avatar from '../ui/Avatar.jsx';
import { getSocket } from '../../services/socket.js';

const QUICK_REACTIONS = ['👍','❤️','😂','😮','😢','🔥','👏','🎉'];

export default function MessageBubble({
  msg, prevMsg, onDelete, onReply,
  selected, onSelect, selectionMode
}) {
  const { user } = useAuthStore();
  const isMine    = msg.sender_id === user?.id;
  const isFirst   = !prevMsg || prevMsg.sender_id !== msg.sender_id;
  const isDeleted = msg.is_deleted;
  const [lightbox, setLightbox]           = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions]         = useState(msg.reactions || []);
  const [starred, setStarred]             = useState(msg.is_starred || false);
  const [copied, setCopied]               = useState(false);
  const longPressTimer = useRef(null);

  const isGif     = msg.media_url?.toLowerCase().endsWith('.gif');
  const isSticker = msg.media_name === 'sticker';

  const handlePressStart = () => {
    if (selectionMode) return;
    longPressTimer.current = setTimeout(() => {
      onSelect?.(msg.id, true);
    }, 500);
  };
  const handlePressEnd = () => clearTimeout(longPressTimer.current);

  const handleClick = () => {
    if (selectionMode) onSelect?.(msg.id, false);
  };

  const handleReaction = (emoji) => {
    const socket = getSocket();
    socket?.emit('reaction:toggle', { messageId: msg.id, emoji, channelId: msg.channel_id });
    setReactions(prev => {
      const exists   = prev.find(r => r.emoji === emoji);
      const iReacted = exists?.users?.find(u => u.id === user?.id);
      if (iReacted) return prev.map(r => r.emoji === emoji
        ? { ...r, count: r.count - 1, users: r.users.filter(u => u.id !== user?.id) }
        : r).filter(r => r.count > 0);
      if (exists) return prev.map(r => r.emoji === emoji
        ? { ...r, count: r.count + 1, users: [...(r.users||[]), { id: user?.id, username: user?.username }] }
        : r);
      return [...prev, { emoji, count: 1, users: [{ id: user?.id, username: user?.username }] }];
    });
    setShowReactions(false);
  };

  const handleStar = () => {
    const socket = getSocket();
    socket?.emit('message:star', { messageId: msg.id }, (res) => {
      if (res?.ok) setStarred(res.starred);
    });
  };

  const handleCopy = () => {
    if (msg.content) {
      navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onUpdate = ({ messageId, reactions: r }) => {
      if (messageId === msg.id) setReactions(r);
    };
    socket.on('reaction:update', onUpdate);
    return () => socket.off('reaction:update', onUpdate);
  }, [msg.id]);

  if (isDeleted) return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-4 py-0.5`}>
      <span className="text-xs text-muted italic font-body px-3 py-1.5 bg-surface rounded-xl border border-border">
        Message deleted
      </span>
    </div>
  );

  return (
    <>
      <div
        className={`flex items-end gap-2 px-4 py-0.5 group msg-appear transition-colors
          ${isMine ? 'flex-row-reverse' : ''}
          ${selected ? 'bg-accent/10' : selectionMode ? 'hover:bg-surface/30 cursor-pointer' : ''}`}
        onMouseDown={handlePressStart} onMouseUp={handlePressEnd}
        onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}
        onClick={handleClick}>

        {/* Selection checkbox */}
        {selectionMode && (
          <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all
            flex items-center justify-center
            ${selected ? 'bg-accent border-accent' : 'border-dim'}`}>
            {selected && <Check size={11} color="#080A0F" strokeWidth={3} />}
          </div>
        )}

        {/* Avatar */}
        {!selectionMode && (
          <div className="w-8 flex-shrink-0">
            {!isMine && isFirst && <Avatar user={msg.sender} size="sm" />}
          </div>
        )}

        <div className={`flex flex-col max-w-xs lg:max-w-md ${isMine ? 'items-end' : 'items-start'}`}>
          {!isMine && isFirst && !selectionMode && (
            <span className="text-xs font-display font-600 text-accent mb-1 ml-1">
              {msg.sender?.username}
            </span>
          )}

          {/* Reply preview */}
          {msg.reply_to && msg.replied_message && (
            <div className="flex items-center gap-2 mb-1 px-3 py-1.5 rounded-xl
              border-l-2 border-accent bg-surface/50 max-w-full opacity-80">
              <div className="min-w-0">
                <p className="text-[10px] text-accent font-display font-600">
                  {msg.replied_message.sender?.username}
                </p>
                <p className="text-xs text-dim font-body truncate">
                  {msg.replied_message.content || '📎 Media'}
                </p>
              </div>
            </div>
          )}

          {/* Star indicator */}
          {starred && (
            <div className={`mb-0.5 ${isMine ? 'self-end' : 'self-start'}`}>
              <Star size={10} className="text-gold fill-gold" />
            </div>
          )}

          {/* Sticker */}
          {isSticker && msg.media_url ? (
            <img src={msg.media_url} alt="sticker"
              className="w-32 h-32 object-contain cursor-pointer hover:scale-110
                transition-transform drop-shadow-lg"
              onClick={() => !selectionMode && setLightbox(true)} loading="lazy" />
          ) : (
            <div className={`rounded-2xl px-4 py-2.5 z-0 ${
              isMine ? 'bg-accent text-white rounded-br-sm'
                     : 'bg-panel border border-border text-white rounded-bl-sm'
            }`}>
              {/* Image */}
              {msg.type === 'image' && msg.media_url && (
                <div className="mb-1.5">
                  <img src={msg.media_url} alt={isGif ? 'gif' : 'image'}
                    className="rounded-xl max-w-xs max-h-64 object-cover cursor-pointer
                      hover:opacity-90 transition-opacity"
                    onClick={() => !selectionMode && setLightbox(true)}
                    loading="lazy" decoding="async" />
                  {isGif && (
                    <span className={`text-[10px] font-mono mt-0.5 block
                      ${isMine ? 'text-void/60' : 'text-dim'}`}>GIF</span>
                  )}
                </div>
              )}
              {/* File */}
              {msg.type === 'file' && msg.media_url && (
                <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-2 mb-1.5 hover:underline
                    ${isMine ? 'text-void/80' : 'text-dim'}`}>
                  <div className={`p-2 rounded-lg ${isMine ? 'bg-void/10' : 'bg-surface'}`}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <p className={`text-xs font-display font-600 ${isMine ? 'text-void' : 'text-text'}`}>
                      {msg.media_name || 'File'}
                    </p>
                    <p className={`text-[10px] ${isMine ? 'text-void/60' : 'text-dim'}`}>
                      {msg.media_size ? (msg.media_size/1024).toFixed(1)+' KB' : ''}
                    </p>
                  </div>
                  <ExternalLink size={12} />
                </a>
              )}
              {/* Text */}
              {msg.content && (
                <p className={`text-sm font-body leading-relaxed whitespace-pre-wrap break-words
                  ${isMine ? 'text-white' : 'text-gray-100'}`}>
                  {msg.content}
                </p>
              )}
            </div>
          )}

          {/* Reactions */}
          {reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {reactions.map(r => {
                const iReacted = r.users?.find(u => u.id === user?.id);
                return (
                  <button key={r.emoji} onClick={() => handleReaction(r.emoji)}
                    title={r.users?.map(u => u.username).join(', ')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                      border transition-all hover:scale-110
                      ${iReacted
                        ? 'bg-accent/20 border-accent/40 text-accent'
                        : 'bg-surface border-border text-dim hover:border-accent/30'}`}>
                    <span>{r.emoji}</span>
                    <span className="font-mono font-600">{r.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Timestamp */}
          <div className={`flex items-center gap-1 mt-0.5 mx-1 ${isMine ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] font-mono text-muted">
              {format(new Date(msg.created_at), 'HH:mm')}
            </span>
            {isMine && (
              <span className={msg.receipts?.every(r => r.read_at) ? 'text-accent' : 'text-dim'}>
                {msg.receipts?.every(r => r.read_at)
                  ? <CheckCheck size={12} /> : <Check size={12} />}
              </span>
            )}
          </div>
        </div>

        {/* Hover actions — only when NOT in selection mode */}
        {!selectionMode && (
          <div className={`opacity-0 group-hover:opacity-100 transition-opacity
            flex items-center gap-1 ${isMine ? 'flex-row-reverse' : ''}`}>
            {/* React */}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setShowReactions(p => !p); }}
                className="p-1.5 bg-surface border border-border rounded-lg text-dim
                  hover:text-gold transition-colors text-sm">
                😊
              </button>
              {showReactions && (
                <div className={`absolute bottom-9 ${isMine ? 'right-0' : 'left-0'}
                  bg-panel border border-border rounded-2xl p-2 flex gap-1
                  shadow-xl z-10 animate-fade-in`}
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  {QUICK_REACTIONS.map(emoji => (
                    <button key={emoji} onClick={() => handleReaction(emoji)}
                      className="text-xl p-1.5 rounded-xl hover:bg-surface hover:scale-125
                        transition-all active:scale-95">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Reply */}
            <button onClick={(e) => { e.stopPropagation(); onReply?.(msg); }}
              className="p-1.5 bg-surface border border-border rounded-lg text-dim
                hover:text-accent transition-colors">
              <Reply size={13} />
            </button>
            {/* Copy */}
            <button onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              title={copied ? 'Copied!' : 'Copy'}
              className={`p-1.5 bg-surface border border-border rounded-lg transition-colors
                ${copied ? 'text-emerald-400' : 'text-dim hover:text-accent'}`}>
              {copied ? <Check size={13} /> : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              )}
            </button>
            {/* Star */}
            <button onClick={(e) => { e.stopPropagation(); handleStar(); }}
              title={starred ? 'Unstar' : 'Star'}
              className={`p-1.5 bg-surface border border-border rounded-lg transition-colors
                ${starred ? 'text-gold' : 'text-dim hover:text-gold'}`}>
              <Star size={13} className={starred ? 'fill-gold' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && msg.media_url && (
        <div className="fixed inset-0 z-50 bg-void/90 backdrop-blur-sm
          flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-dim hover:text-text
            bg-panel border border-border rounded-xl p-2 transition-colors">
            <X size={18} />
          </button>
          <img src={msg.media_url} alt="full size"
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()} decoding="async" />
        </div>
      )}
    </>
  );
}