import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Image, X, Smile } from 'lucide-react';
import { getSocket } from '../../services/socket.js';
import api from '../../services/api.js';
import EmojiPicker from './EmojiPicker.jsx';
import StickerPicker from './StickerPicker.jsx';

const ALLOWED_IMAGE = ['image/jpeg','image/png','image/gif','image/webp'];
const MAX = 10 * 1024 * 1024;

export default function MessageInput({ channelId, replyTo, onReplySent }) {
  const [text, setText]               = useState('');
  const [sending, setSending]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [preview, setPreview]         = useState(null);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [isDragging, setIsDragging]   = useState(false);
  const typingTimer = useRef(null);
  const fileRef     = useRef(null);
  const textareaRef = useRef(null);
  const dropZoneRef = useRef(null);
  const socket      = getSocket();

  // Focus when replying
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const sendTyping = useCallback((active) => {
    socket?.emit(active ? 'typing:start' : 'typing:stop', { channelId });
  }, [channelId, socket]);

  // Ctrl+V paste
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) setFilePreview(file);
          return;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDragOver  = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); if (!dropZoneRef.current?.contains(e.relatedTarget)) setIsDragging(false); };
  const handleDrop      = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) setFilePreview(file); };

  const setFilePreview = (file) => {
    if (file.size > MAX) return alert('File too large (max 10MB)');
    const isImage = ALLOWED_IMAGE.includes(file.type) || file.type.startsWith('image/');
    setPreview({ file, url: isImage ? URL.createObjectURL(file) : null, type: isImage ? 'image' : 'file' });
  };

  const handleChange = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    if (typingTimer.current) clearTimeout(typingTimer.current);
    sendTyping(true);
    typingTimer.current = setTimeout(() => sendTyping(false), 2000);
  };

  const handleEmojiSelect = (emoji) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart, end = ta.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + emoji.length; ta.focus(); }, 10);
    } else { setText(t => t + emoji); }
    setShowEmoji(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setFilePreview(file);
    e.target.value = '';
  };

  const send = async () => {
    if ((!text.trim() && !preview) || sending) return;
    setSending(true);
    sendTyping(false);
    if (typingTimer.current) clearTimeout(typingTimer.current);

    try {
      let mediaUrl = null, mediaName = null, mediaSize = null, type = 'text';
      if (preview) {
        setUploading(true);
        const form = new FormData();
        form.append('file', preview.file);
        const { data } = await api.post('/api/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        mediaUrl = data.url; mediaName = data.name;
        mediaSize = data.size; type = data.type;
        setUploading(false);
      }
      socket?.emit('message:send', {
        channelId,
        content: text.trim() || null,
        type,
        mediaUrl,
        mediaName,
        mediaSize,
        replyTo: replyTo ? replyTo.id : null,
      }, (res) => {
        if (res?.error) console.error('[send] error:', res.error);
      });

      setText('');
      setPreview(null);
      onReplySent?.();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (e) {
      console.error('Send failed:', e);
      setUploading(false);
    } finally { setSending(false); }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') { setShowEmoji(false); setShowSticker(false); }
  };

  const toggleEmoji   = () => { setShowEmoji(p => !p);   setShowSticker(false); };
  const toggleSticker = () => { setShowSticker(p => !p); setShowEmoji(false);   };

  return (
    <div className="px-4 pb-4 pt-2">
      {/* File preview */}
      {preview && (
        <div className="mb-2 flex items-center gap-3 bg-surface border border-border
          rounded-xl px-3 py-2 animate-fade-in">
          {preview.type === 'image' && preview.url ? (
            <img src={preview.url} alt="preview"
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-panel rounded-lg flex items-center justify-center
              border border-border flex-shrink-0">
              <Paperclip size={14} className="text-dim" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-body text-text truncate">{preview.file.name}</p>
            <p className="text-xs font-mono text-dim">{(preview.file.size/1024).toFixed(1)} KB</p>
          </div>
          {uploading && (
            <span className="text-xs text-accent font-mono animate-pulse flex-shrink-0">
              Uploading…
            </span>
          )}
          <button onClick={() => setPreview(null)}
            className="text-dim hover:text-pulse transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div ref={dropZoneRef} onDragOver={handleDragOver}
        onDragLeave={handleDragLeave} onDrop={handleDrop}
        className={`relative transition-all duration-200 ${isDragging ? 'scale-[1.01]' : ''}`}>

        {isDragging && (
          <div className="absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-accent
            bg-accent/5 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-fade-in">
            <div className="text-center">
              <div className="text-3xl mb-1">📎</div>
              <p className="text-accent text-sm font-display font-700">Drop to send</p>
            </div>
          </div>
        )}

        <div className={`flex items-end gap-2 bg-panel border rounded-2xl px-3 py-2
          focus-within:border-accent/40 transition-all relative
          ${isDragging ? 'border-accent/60' : 'border-border'}`}>

          {/* File buttons */}
          <div className="flex gap-1 pb-1 flex-shrink-0">
            <button
              onClick={() => { if(fileRef.current){ fileRef.current.accept='image/*'; fileRef.current.click(); } }}
              className="p-1.5 text-dim hover:text-accent transition-colors rounded-lg hover:bg-surface"
              title="Image">
              <Image size={16} />
            </button>
            <button
              onClick={() => { if(fileRef.current){ fileRef.current.accept='*/*'; fileRef.current.click(); } }}
              className="p-1.5 text-dim hover:text-accent transition-colors rounded-lg hover:bg-surface"
              title="File">
              <Paperclip size={16} />
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef} value={text}
            onChange={handleChange} onKeyDown={onKey}
            placeholder={
              replyTo
                ? `Reply to ${replyTo.sender?.username}…`
                : isDragging
                  ? 'Drop file here…'
                  : 'Type a message… (Ctrl+V to paste image)'
            }
            rows={1}
            style={{ resize:'none', maxHeight:'120px', minHeight:'24px' }}
            className="flex-1 bg-transparent text-sm font-body text-text placeholder:text-muted
              focus:outline-none py-1 leading-relaxed overflow-y-auto"
          />

          {/* Emoji + Sticker */}
          <div className="flex gap-1 pb-1 flex-shrink-0 relative">
            <button onClick={toggleEmoji}
              className={`p-1.5 transition-colors rounded-lg hover:bg-surface
                ${showEmoji ? 'text-gold' : 'text-dim hover:text-gold'}`}
              title="Emojis">
              <Smile size={16} />
            </button>
            <button onClick={toggleSticker}
              className={`p-1.5 transition-colors rounded-lg hover:bg-surface
                text-lg leading-none pb-2
                ${showSticker ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
              title="Stickers">
              🎭
            </button>
            {showEmoji && (
              <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
            )}
            {showSticker && (
              <StickerPicker channelId={channelId} onClose={() => setShowSticker(false)} />
            )}
          </div>

          {/* Send */}
          <button onClick={send} disabled={sending || (!text.trim() && !preview)}
            className="p-2 bg-accent text-void rounded-xl hover:bg-accentDim transition-all
              disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 mb-0.5
              hover:shadow-lg hover:shadow-accent/20 active:scale-95">
            <Send size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <p className="text-center text-muted text-[10px] font-mono mt-1.5">
        AES-256 encrypted · Enter to send · Ctrl+V paste · Drag & drop
      </p>
    </div>
  );
}