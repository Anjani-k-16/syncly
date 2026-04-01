import React, { useState, useEffect } from 'react';
import { X, Search, Check, Loader2 } from 'lucide-react';
import Avatar from './Avatar.jsx';
import api from '../../services/api.js';

export default function AddMembersModal({ channelId, channelName, onClose }) {
  const [search, setSearch]                 = useState('');
  const [results, setResults]               = useState([]);
  const [selected, setSelected]             = useState([]);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [adding, setAdding]                 = useState(false);
  const [success, setSuccess]               = useState('');
  const [error, setError]                   = useState('');

  useEffect(() => {
    api.get(`/api/channels/${channelId}/members`)
      .then(({ data }) => setCurrentMembers(data.members.map(m => m.id)))
      .catch(() => {});
  }, [channelId]);

  useEffect(() => {
    if (!search || search.length < 2) return setResults([]);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/api/users/search', { params: { q: search } });
        setResults(data.users.filter(u =>
          !currentMembers.includes(u.id) && u.friend_status === 'friends'
        ));
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, currentMembers]);

  const toggleUser = (u) => {
    setSelected(prev =>
      prev.find(x => x.id === u.id)
        ? prev.filter(x => x.id !== u.id)
        : [...prev, u]
    );
  };

  const handleAdd = async () => {
    if (!selected.length) return;
    setAdding(true); setError('');
    try {
      await api.post(`/api/channels/${channelId}/members`, {
        memberIds: selected.map(u => u.id)
      });
      setSuccess(`✅ ${selected.length} member${selected.length > 1 ? 's' : ''} added!`);
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to add members');
    }
    setAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-panel border border-border rounded-2xl p-6
        w-full max-w-sm animate-fade-up glow-accent">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-700 text-text text-lg">Add Members</h3>
            <p className="text-xs text-dim font-body">to #{channelName}</p>
          </div>
          <button onClick={onClose} className="text-dim hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search friends to add…"
            className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-2.5
              text-sm font-body text-text placeholder:text-muted focus:outline-none
              focus:border-accent/50 transition-all" />
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selected.map(u => (
              <span key={u.id} className="flex items-center gap-1 bg-accent/10
                border border-accent/20 rounded-full px-2.5 py-1
                text-xs text-accent font-display font-600">
                {u.username}
                <button onClick={() => toggleUser(u)}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}

        <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
          {results.length === 0 && search.length >= 2 && (
            <p className="text-center text-dim text-xs font-body py-4">
              No friends found or already in group
            </p>
          )}
          {search.length < 2 && (
            <p className="text-center text-muted text-xs font-body py-4">
              Type at least 2 characters to search
            </p>
          )}
          {results.map(u => (
            <div key={u.id} onClick={() => toggleUser(u)}
              className="flex items-center gap-3 p-2.5 rounded-xl
                hover:bg-surface transition-all cursor-pointer">
              <Avatar user={u} size="sm" showOnline />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-600 text-text">{u.username}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center
                justify-center transition-all
                ${selected.find(x => x.id === u.id)
                  ? 'bg-accent border-accent' : 'border-dim'}`}>
                {selected.find(x => x.id === u.id) && (
                  <Check size={11} color="#080A0F" strokeWidth={3} />
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-pulse/10 border border-pulse/30 rounded-xl
            px-3 py-2 mb-3 text-pulse text-xs">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl
            px-3 py-2 mb-3 text-emerald-400 text-xs">{success}</div>
        )}

        <button onClick={handleAdd} disabled={adding || !selected.length}
          className="w-full bg-accent hover:bg-accentDim text-void font-display font-600
            py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {adding ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Adding…
            </span>
          ) : `Add ${selected.length > 0 ? selected.length + ' ' : ''}Member${selected.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}