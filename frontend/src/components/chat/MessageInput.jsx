import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Image, X, Smile, Camera } from 'lucide-react';
import { getSocket } from '../../services/socket.js';
import api from '../../services/api.js';
import EmojiPicker from './EmojiPicker.jsx';
import StickerPicker from './StickerPicker.jsx';

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX = 10 * 1024 * 1024;

export default function MessageInput({ channelId, replyTo, onReplySent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const typingTimer = useRef(null);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);
  const dropZoneRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const socket = getSocket();

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const sendTyping = useCallback((active) => {
    socket?.emit(active ? 'typing:start' : 'typing:stop', { channelId });
  }, [channelId, socket]);

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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneRef.current?.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setFilePreview(file);
  };

  const setFilePreview = (file) => {
    if (file.size > MAX) return alert('File too large (max 10MB)');
    const isImage =
      ALLOWED_IMAGE.includes(file.type) ||
      file.type.startsWith('image/');

    setPreview({
      file,
      url: isImage ? URL.createObjectURL(file) : null,
      type: isImage ? 'image' : 'file',
    });
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
      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      const newText =
        text.slice(0, start) + emoji + text.slice(end);

      setText(newText);

      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd =
          start + emoji.length;
        ta.focus();
      }, 10);
    } else {
      setText((t) => t + emoji);
    }

    setShowEmoji(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setFilePreview(file);
    e.target.value = '';
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      streamRef.current = stream;
      setShowCamera(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      alert('Camera access denied or unavailable');
      console.error(error);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File(
        [blob],
        `photo-${Date.now()}.png`,
        { type: 'image/png' }
      );

      setFilePreview(file);
      closeCamera();
    }, 'image/png');
  };

  const send = async () => {
    if ((!text.trim() && !preview) || sending) return;

    setSending(true);
    sendTyping(false);

    if (typingTimer.current) clearTimeout(typingTimer.current);

    try {
      let mediaUrl = null;
      let mediaName = null;
      let mediaSize = null;
      let type = 'text';

      if (preview) {
        setUploading(true);

        const form = new FormData();
        form.append('file', preview.file);

        const { data } = await api.post('/api/upload', form, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        mediaUrl = data.url;
        mediaName = data.name;
        mediaSize = data.size;
        type = data.type;

        setUploading(false);
      }

      socket?.emit(
        'message:send',
        {
          channelId,
          content: text.trim() || null,
          type,
          mediaUrl,
          mediaName,
          mediaSize,
          replyTo: replyTo ? replyTo.id : null,
        },
        (res) => {
          if (res?.error)
            console.error('[send] error:', res.error);
        }
      );

      setText('');
      setPreview(null);
      onReplySent?.();

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (e) {
      console.error('Send failed:', e);
      setUploading(false);
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }

    if (e.key === 'Escape') {
      setShowEmoji(false);
      setShowSticker(false);
    }
  };

  return (
    <div className="px-4 pb-4 pt-2">
      {preview && (
        <div className="mb-2 flex items-center gap-3 bg-surface border border-accent/30 rounded-xl px-3 py-2 animate-fade-in">
          {preview.type === 'image' && preview.url ? (
            <img
              src={preview.url}
              alt="preview"
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <Paperclip size={14} />
          )}

          <div className="flex-1">
            <p className="text-sm text-text truncate">
              {preview.file.name}
            </p>
          </div>

          <button onClick={() => setPreview(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-panel border rounded-2xl px-3 py-2">
        <button onClick={() => fileRef.current?.click()}>
          <Image size={16} />
        </button>

        <button onClick={openCamera}>
          <Camera size={16} />
        </button>

        <button>
          <Paperclip size={16} />
        </button>

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={onKey}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-transparent text-sm text-white focus:outline-none"
        />

        <button onClick={send}>
          <Send size={15} />
        </button>
      </div>

      {showCamera && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center">
          <div className="bg-panel rounded-2xl p-4 w-[420px] max-w-[90%]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-xl"
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={closeCamera}
                className="px-4 py-2 rounded-xl bg-surface text-white"
              >
                Cancel
              </button>

              <button
                onClick={capturePhoto}
                className="px-4 py-2 rounded-xl bg-accent text-black"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}