import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Loader2, Upload, Link } from 'lucide-react';
import api from '../../services/api.js';
import { getSocket } from '../../services/socket.js';

const BUILT_IN_PACKS = [
  {
    id: 'expressions', name: 'Expressions', icon: '😄',
    stickers: [
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f603/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f604/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f601/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f606/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f605/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f642/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f643/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f607/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f970/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.webp',
    ],
  },
  {
    id: 'love', name: 'Love', icon: '❤️',
    stickers: [
      'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f495/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f497/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f498/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f49d/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f49f/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48b/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f617/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f619/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f61a/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60b/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f970/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1fae6/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48f/512.webp',
    ],
  },
  {
    id: 'sad', name: 'Sad & Crying', icon: '😢',
    stickers: [
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f614/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f61e/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f61f/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f625/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62a/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62b/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f629/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f641/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/2639_fe0f/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f613/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f615/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f616/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62c/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1fae4/512.webp',
    ],
  },
  {
    id: 'angry', name: 'Angry', icon: '😤',
    stickers: [
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f620/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f624/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92c/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f610/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f611/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f636/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f644/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62e/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62f/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f632/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f633/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f628/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f630/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f627/512.webp',
    ],
  },
  {
    id: 'celebrate', name: 'Celebrate', icon: '🎉',
    stickers: [
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f38a/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f942/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f386/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f387/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f31f/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f947/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48e/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f381/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f380/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f388/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f396_fe0f/512.webp',
    ],
  },
  {
    id: 'animals', name: 'Animals', icon: '🐶',
    stickers: [
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f436/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f431/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43c/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43b/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f42f/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f981/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f430/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f439/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f425/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f426/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f433/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f42c/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f438/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f434/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43e/512.webp',
    ],
  },
];

const STICKER_STORAGE_KEY = 'syncly_user_stickers_v2';

export default function StickerPicker({ channelId, onClose }) {
  const [activeTab, setActiveTab]       = useState('builtin');
  const [activePack, setActivePack]     = useState(BUILT_IN_PACKS[0].id);
  const [userStickers, setUserStickers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STICKER_STORAGE_KEY) || '[]'); }
    catch { return []; }
  });
  const [addMode, setAddMode]       = useState(null);
  const [urlInput, setUrlInput]     = useState('');
  const [urlPreview, setUrlPreview] = useState(null);
  const [urlError, setUrlError]     = useState('');
  const [uploading, setUploading]   = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const pickerRef = useRef(null);
  const fileRef   = useRef(null);
  const socket    = getSocket();

  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handleClick), 100);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const sendSticker = (url) => {
    socket?.emit('message:send', {
      channelId, content: null, type: 'image',
      mediaUrl: url, mediaName: 'sticker', mediaSize: null,
    });
    onClose();
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrlInput(val);
    setUrlError('');
    setUrlPreview(null);
    if (val.startsWith('http') && (
      val.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ||
      val.includes('giphy.com') ||
      val.includes('tenor.com') ||
      val.includes('imgur.com') ||
      val.includes('gstatic.com')
    )) {
      setUrlPreview(val);
    }
  };

  const addStickerByUrl = () => {
    if (!urlInput.startsWith('http')) {
      setUrlError('Please enter a valid image URL starting with http');
      return;
    }
    const updated = [urlInput, ...userStickers];
    setUserStickers(updated);
    localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(updated));
    setUrlInput(''); setUrlPreview(null); setAddMode(null);
  };

  const uploadSticker = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/api/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = [data.url, ...userStickers];
      setUserStickers(updated);
      localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(updated));
      setAddMode(null);
    } catch (e) { console.error(e); }
    setUploading(false);
    e.target.value = '';
  };

  const deleteSticker = (url) => {
    const updated = userStickers.filter(s => s !== url);
    setUserStickers(updated);
    localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(updated));
  };

  const currentPack = BUILT_IN_PACKS.find(p => p.id === activePack);

  return (
    <div ref={pickerRef}
      className="absolute bottom-14 right-0 w-96 bg-panel border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-up"
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button onClick={() => setActiveTab('builtin')}
          className={`flex-1 py-3 text-xs font-display font-700 uppercase tracking-widest transition-all
            ${activeTab === 'builtin'
              ? 'text-accent border-b-2 border-accent bg-surface/30'
              : 'text-dim hover:text-text'}`}>
          🎨 Sticker Packs
        </button>
        <button onClick={() => { setActiveTab('mine'); setAddMode(null); }}
          className={`flex-1 py-3 text-xs font-display font-700 uppercase tracking-widest transition-all
            ${activeTab === 'mine'
              ? 'text-accent border-b-2 border-accent bg-surface/30'
              : 'text-dim hover:text-text'}`}>
          ⭐ My Stickers
        </button>
      </div>

      {/* BUILT-IN PACKS */}
      {activeTab === 'builtin' && (
        <>
          <div className="flex gap-2 px-3 py-2 border-b border-border overflow-x-auto">
            {BUILT_IN_PACKS.map(pack => (
              <button key={pack.id} onClick={() => setActivePack(pack.id)} title={pack.name}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all
                  ${activePack === pack.id
                    ? 'bg-accent/10 border border-accent/30'
                    : 'hover:bg-surface border border-transparent'}`}>
                <span className="text-2xl">{pack.icon}</span>
                <span className={`text-[9px] font-display font-700 uppercase tracking-wide whitespace-nowrap
                  ${activePack === pack.id ? 'text-accent' : 'text-dim'}`}>
                  {pack.name}
                </span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 p-3 overflow-y-auto" style={{ height: '260px' }}>
            {currentPack?.stickers.map((url, i) => (
              <button key={i} onClick={() => sendSticker(url)}
                className="aspect-square rounded-xl overflow-hidden hover:scale-110 active:scale-95
                  transition-all bg-surface/50 border border-border/30 hover:border-accent/30 p-1
                  hover:shadow-lg hover:shadow-accent/10">
                <img src={url} alt="sticker" className="w-full h-full object-contain" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}

      {/* MY STICKERS */}
      {activeTab === 'mine' && (
        <>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <p className="text-xs text-dim font-body">
              {userStickers.length} sticker{userStickers.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              {userStickers.length > 0 && (
                <button onClick={() => setDeleteMode(p => !p)}
                  className={`text-xs font-display font-600 px-2 py-1 rounded-lg transition-all
                    ${deleteMode
                      ? 'bg-pulse/10 text-pulse border border-pulse/30'
                      : 'bg-surface text-dim hover:text-text border border-border'}`}>
                  {deleteMode ? '✓ Done' : '🗑 Delete'}
                </button>
              )}
              <button onClick={() => setAddMode(addMode === 'url' ? null : 'url')}
                className={`flex items-center gap-1 text-xs font-display font-600 px-2 py-1 rounded-lg transition-all border
                  ${addMode === 'url'
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-surface text-dim hover:text-text border-border'}`}>
                <Link size={11} /> URL
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1 bg-accent hover:bg-accentDim text-void
                  text-xs font-display font-700 px-2 py-1.5 rounded-lg transition-all disabled:opacity-50">
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                {uploading ? '…' : 'File'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadSticker} />
            </div>
          </div>

          {/* URL input */}
          {addMode === 'url' && (
            <div className="px-3 py-3 border-b border-border bg-surface/30 animate-fade-in">
              <p className="text-xs font-display font-600 text-dim uppercase tracking-widest mb-1">
                Paste Image URL
              </p>
              <p className="text-[10px] text-muted font-body mb-2">
                Go to Google Images → right-click any image → "Copy image address" → paste here
              </p>
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={handleUrlChange}
                  placeholder="https://example.com/sticker.png"
                  className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-xs
                    font-body text-text placeholder:text-muted focus:outline-none focus:border-accent/50 transition-all"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') addStickerByUrl();
                    if (e.key === 'Escape') setAddMode(null);
                  }}
                />
                <button onClick={addStickerByUrl} disabled={!urlInput}
                  className="bg-accent hover:bg-accentDim text-void text-xs font-display font-700
                    px-3 py-2 rounded-xl transition-all disabled:opacity-40">
                  Add
                </button>
              </div>
              {urlError && <p className="text-pulse text-[10px] font-body mt-1">{urlError}</p>}
              {urlPreview && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={urlPreview} alt="preview"
                    className="w-12 h-12 rounded-lg object-contain bg-surface border border-border"
                    onError={() => { setUrlPreview(null); setUrlError('Could not load — check the URL'); }}
                  />
                  <p className="text-[10px] text-accent font-body">✓ Preview looks good!</p>
                </div>
              )}
            </div>
          )}

          {/* Sticker grid */}
          <div className="overflow-y-auto p-3"
            style={{ height: addMode === 'url' ? '180px' : '300px' }}>
            {userStickers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="text-5xl">🎭</div>
                <p className="text-dim text-sm font-body">No stickers yet!</p>
                <p className="text-muted text-xs font-body max-w-xs">
                  Paste an image URL or upload from your device
                </p>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setAddMode('url')}
                    className="flex items-center gap-1.5 bg-surface border border-border text-dim
                      hover:text-text text-xs font-display font-600 px-3 py-2 rounded-xl transition-all">
                    <Link size={12} /> Paste URL
                  </button>
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 bg-accent hover:bg-accentDim text-void
                      text-xs font-display font-700 px-3 py-2 rounded-xl transition-all">
                    <Upload size={12} /> Upload File
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {userStickers.map((url, i) => (
                  <div key={i} className="relative aspect-square">
                    <button
                      onClick={() => deleteMode ? deleteSticker(url) : sendSticker(url)}
                      className={`w-full h-full rounded-xl overflow-hidden transition-all p-1
                        bg-surface/50 border hover:scale-105 active:scale-95
                        ${deleteMode
                          ? 'border-pulse/50 hover:border-pulse'
                          : 'border-border/30 hover:border-accent/30'}`}>
                      <img src={url} alt="sticker"
                        className="w-full h-full object-contain" loading="lazy"
                        onError={(e) => { e.target.style.opacity = '0.3'; }} />
                    </button>
                    {deleteMode && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-pulse rounded-full
                        flex items-center justify-center pointer-events-none">
                        <X size={10} color="white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border bg-surface/20">
        <p className="text-center text-[10px] text-muted font-body">
          {activeTab === 'builtin'
            ? `${currentPack?.stickers.length} stickers · ${currentPack?.name}`
            : 'Tip: Right-click image on Google → Copy image address → Paste URL'}
        </p>
      </div>
    </div>
  );
}