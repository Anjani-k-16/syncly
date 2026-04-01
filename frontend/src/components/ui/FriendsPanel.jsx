import React, { useState, useEffect } from 'react';
import { X, Users, MessageSquare, UserMinus, Clock, Check } from 'lucide-react';
import Avatar from './Avatar.jsx';
import api from '../../services/api.js';
import { useFriendStore } from '../../store/friendStore.js';

export default function FriendsPanel({ onClose, onStartDM }) {
  const [tab, setTab]           = useState('friends');
  const [friends, setFriends]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const { setPendingRequests, removePendingRequest, pendingRequests } = useFriendStore();

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    setRequests(prev => {
      const ids = new Set(prev.map(r => r.id));
      const newOnes = pendingRequests.filter(r => !ids.has(r.id));
      return [...newOnes, ...prev];
    });
  }, [pendingRequests]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fr, rr] = await Promise.all([
        api.get('/api/friends'),
        api.get('/api/friends/requests'),
      ]);
      setFriends(fr.data.friends);
      setRequests(rr.data.requests);
      setPendingRequests(rr.data.requests);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const respondRequest = async (requestId, action) => {
    try {
      await api.put(`/api/friends/requests/${requestId}`, { action });
      removePendingRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      if (action === 'accept') await loadData();
    } catch (e) { console.error(e); }
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm('Remove this friend?')) return;
    try {
      await api.delete(`/api/friends/${friendId}`);
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-panel border border-border rounded-2xl w-full max-w-sm
        animate-fade-up glow-accent overflow-hidden" style={{ maxHeight: '80vh' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display font-700 text-text text-lg">Friends</h3>
          <button onClick={onClose} className="text-dim hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-border">
          <button onClick={() => setTab('friends')}
            className={`flex-1 py-3 text-xs font-display font-700 uppercase tracking-widest
              transition-all flex items-center justify-center gap-1.5
              ${tab === 'friends' ? 'text-accent border-b-2 border-accent' : 'text-dim hover:text-text'}`}>
            <Users size={12} /> Friends ({friends.length})
          </button>
          <button onClick={() => setTab('requests')}
            className={`flex-1 py-3 text-xs font-display font-700 uppercase tracking-widest
              transition-all flex items-center justify-center gap-1.5
              ${tab === 'requests' ? 'text-accent border-b-2 border-accent' : 'text-dim hover:text-text'}`}>
            <Clock size={12} /> Requests
            {requests.length > 0 && (
              <span className="bg-pulse text-white text-[10px] rounded-full w-4 h-4
                flex items-center justify-center font-700">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === 'friends' ? (
            <div className="p-3 space-y-1">
              {friends.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-dim text-sm font-body">No friends yet</p>
                  <p className="text-muted text-xs font-body mt-1">
                    Search for users to send friend requests
                  </p>
                </div>
              ) : friends.map(f => (
                <div key={f.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition-all group">
                  <Avatar user={f} size="md" showOnline />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-600 text-text">{f.username}</p>
                    <p className={`text-[10px] font-mono ${f.is_online ? 'text-emerald-400' : 'text-dim'}`}>
                      {f.is_online ? '● Online' : '○ Offline'}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onStartDM(f)}
                      className="p-1.5 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                      title="Send message">
                      <MessageSquare size={13} />
                    </button>
                    <button onClick={() => removeFriend(f.id)}
                      className="p-1.5 bg-pulse/10 text-pulse rounded-lg hover:bg-pulse/20 transition-colors"
                      title="Remove friend">
                      <UserMinus size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {requests.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-dim text-sm font-body">No pending requests</p>
                </div>
              ) : requests.map(r => (
                <div key={r.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl
                    bg-surface/50 border border-border/50 animate-fade-in">
                  <Avatar user={r.from_user} size="md" showOnline />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-600 text-text">
                      {r.from_user.username}
                    </p>
                    <p className="text-[10px] text-dim font-body">Wants to be your friend</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => respondRequest(r.id, 'accept')}
                      className="p-2 bg-accent text-void rounded-xl hover:bg-accentDim transition-all"
                      title="Accept">
                      <Check size={13} />
                    </button>
                    <button onClick={() => respondRequest(r.id, 'decline')}
                      className="p-2 bg-surface border border-border text-dim
                        hover:text-pulse rounded-xl transition-all" title="Decline">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
