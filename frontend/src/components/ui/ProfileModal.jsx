import React, { useState, useRef } from 'react';
import { X, Camera, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import Avatar from './Avatar.jsx';
import api from '../../services/api.js';

export default function ProfileModal({ onClose }) {
  const { user, init } = useAuthStore();
  const [username, setUsername]   = useState(user?.username || '');
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const fileRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      setAvatarPreview(URL.createObjectURL(file));
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/api/users/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarPreview(data.avatarUrl);
      setSuccess('Avatar updated!');
      await init();
    } catch (e) {
      setError('Failed to upload avatar');
      setAvatarPreview(user?.avatar_url);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!username.trim()) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put('/api/users/profile', { username: username.trim() });
      setSuccess('Profile updated!');
      await init();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-panel border border-border rounded-2xl p-6 w-full max-w-sm animate-fade-up glow-accent">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-700 text-text text-lg">Edit Profile</h3>
          <button onClick={onClose} className="text-dim hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <Avatar user={user} size="xl" />
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full
              bg-void/60 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading
                ? <Loader2 size={20} className="text-white animate-spin" />
                : <Camera size={20} className="text-white" />}
            </div>
            <input ref={fileRef} type="file" accept="image/*"
              className="hidden" onChange={handleAvatarChange} />
          </div>
          <p className="text-xs text-dim font-body mt-2">Click avatar to change photo</p>
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-xs font-display font-600 text-dim uppercase tracking-widest mb-2">
            Username
          </label>
          <input value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text
              font-body text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 transition-all"
          />
        </div>

        {/* Email (read only) */}
        <div className="mb-6">
          <label className="block text-xs font-display font-600 text-dim uppercase tracking-widest mb-2">
            Email
          </label>
          <input value={user?.email || ''} readOnly
            className="w-full bg-surface/50 border border-border/50 rounded-xl px-4 py-3
              text-dim font-body text-sm cursor-not-allowed" />
        </div>

        {/* Status */}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30
            rounded-xl px-3 py-2 mb-4 animate-fade-in">
            <Check size={14} className="text-emerald-400" />
            <p className="text-emerald-400 text-xs font-body">{success}</p>
          </div>
        )}
        {error && (
          <div className="bg-pulse/10 border border-pulse/30 rounded-xl px-3 py-2 mb-4 animate-fade-in">
            <p className="text-pulse text-xs font-body">{error}</p>
          </div>
        )}

        {/* Save */}
        <button onClick={handleSave} disabled={saving || !username.trim()}
          className="w-full bg-accent hover:bg-accentDim text-void font-display font-600
            py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed
            hover:shadow-lg hover:shadow-accent/20">
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Saving…
            </span>
          ) : 'Save Changes'}
        </button>

        <p className="text-center text-muted text-[10px] font-mono mt-4">
          Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
        </p>
      </div>
    </div>
  );
}