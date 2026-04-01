import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Hash, Lock, Plus, Search, LogOut, MessageSquare, Users, X, Check, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useChatStore } from '../../store/chatStore.js';
import { useFriendStore } from '../../store/friendStore.js';
import Avatar from '../ui/Avatar.jsx';
import ProfileModal from '../ui/ProfileModal.jsx';
import FriendsPanel from '../ui/FriendsPanel.jsx';
import api from '../../services/api.js';
import { getSocket } from '../../services/socket.js';

export default function Sidebar({onNavigate}) {
  const { user, logout } = useAuthStore();
  const { channels, activeChannel, setActiveChannel, fetchChannels, addChannel, unreadCounts } = useChatStore();
  const { pendingCount, setPendingRequests } = useFriendStore();

  const [modal, setModal]                 = useState(null);
  const [search, setSearch]               = useState('');
  const [userSearch, setUserSearch]       = useState('');
  const [userResults, setUserResults]     = useState([]);
  const [groupName, setGroupName]         = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [creating, setCreating]           = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
  const [showFriends, setShowFriends]     = useState(false);
  const [requestStatus, setRequestStatus] = useState({});
  const [friends, setFriends]             = useState([]);
  const [friendSearch, setFriendSearch]   = useState('');
  const [activeTab, setActiveTab]         = useState('chats');

  useEffect(() => {
    fetchChannels();
    loadPendingCount();
    loadFriends();
  }, []);
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onAccepted = () => { loadFriends(); loadPendingCount(); };
    socket.on('friend:accepted', onAccepted);
    return () => socket.off('friend:accepted', onAccepted);
  }, []);

  const loadPendingCount = async () => {
    try {
      const { data } = await api.get('/api/friends/requests');
      setPendingRequests(data.requests);
    } catch {}
  };

  const loadFriends = async () => {
    try {
      const { data } = await api.get('/api/friends');
      setFriends(data.friends);
    } catch {}
  };

  useEffect(() => {
    if (!userSearch || userSearch.length < 2) return setUserResults([]);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/api/users/search', { params: { q: userSearch } });
        setUserResults(data.users);
      } catch { setUserResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const sendFriendRequest = async (targetUser) => {
    try {
      const { data } = await api.post('/api/friends/request', { targetUserId: targetUser.id });
      setRequestStatus(prev => ({ ...prev, [targetUser.id]: data.status }));
    } catch (e) { console.error(e); }
  };

  const startDM = async (target) => {
    setCreating(true);
    try {
      const { data } = await api.post('/api/channels/dm', { targetUserId: target.id });
      const channel = { ...data.channel, dm_partner: target };
      addChannel(channel);
      setActiveChannel(channel);
      onNavigate?.();
      setActiveTab('chats');
      closeModal();
      setShowFriends(false);
    } catch (e) { console.error(e); }
    setCreating(false);
  };

  const createGroup = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/api/channels', {
        name: groupName, type: 'group', memberIds: selectedUsers.map(u => u.id),
      });
      addChannel(data.channel);
      setActiveChannel(data.channel);
      onNavigate?.();
      closeModal();
    } catch (e) { console.error(e); }
    setCreating(false);
  };

  const closeModal = () => {
    setModal(null); setUserSearch(''); setUserResults([]);
    setGroupName(''); setSelectedUsers([]);
  };

  const filtered = channels.filter(c => {
    const name = c.type === 'direct' ? c.dm_partner?.username : c.name;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const getPreview = (ch) => {
    if (!ch.last_message) return 'No messages yet';
    const { type, content } = ch.last_message;
    if (type === 'image') return '📷 Image';
    if (type === 'file')  return '📎 File';
    return (content || '').slice(0, 40) + ((content || '').length > 40 ? '…' : '');
  };

  const getStatusLabel = (status) => {
    if (status === 'friends')          return { label: '✓ Friends',  color: 'text-emerald-400' };
    if (status === 'pending_sent')     return { label: '⏳ Sent',     color: 'text-gold' };
    if (status === 'pending_received') return { label: '📨 Accept?', color: 'text-accent' };
    return null;
  };

  return (
    <>
      <aside className="w-72 bg-panel border-r border-border flex flex-col h-full flex-shrink-0">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <MessageSquare size={14} color="#080A0F" strokeWidth={2.5} />
              </div>
              <span className="font-display font-700 text-text text-lg tracking-tight">Syncly</span>
            </div>
            <button
              onClick={() => { setShowFriends(true); loadPendingCount(); }}
              className="relative p-1.5 text-dim hover:text-accent transition-colors rounded-lg hover:bg-surface"
              title="Friend Requests">
              <Users size={16} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-pulse text-white
                  text-[9px] font-700 rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {/* Chats / Friends tabs */}
          <div className="flex bg-surface rounded-xl p-0.5">
            <button onClick={() => setActiveTab('chats')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-display font-600 transition-all
                ${activeTab === 'chats' ? 'bg-accent text-void' : 'text-dim hover:text-text'}`}>
              Chats
            </button>
            <button onClick={() => { setActiveTab('friends'); loadFriends(); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-display font-600 transition-all
                ${activeTab === 'friends' ? 'bg-accent text-void' : 'text-dim hover:text-text'}`}>
              Friends {friends.length > 0 && `(${friends.length})`}
            </button>
          </div>
        </div>

        {/* ── CHATS TAB ── */}
        {activeTab === 'chats' && (
          <>
            <div className="px-4 py-2 space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-xs
                    font-body text-text placeholder:text-muted focus:outline-none
                    focus:border-accent/50 transition-all" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModal('dm')}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-surface
                    hover:bg-muted border border-border rounded-lg py-1.5 text-xs
                    font-display font-600 text-dim hover:text-text transition-all">
                  <Plus size={11} /> DM
                </button>
                <button onClick={() => setModal('group')}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-surface
                    hover:bg-muted border border-border rounded-lg py-1.5 text-xs
                    font-display font-600 text-dim hover:text-text transition-all">
                  <Users size={11} /> Group
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
              {filtered.length === 0 && (
                <div className="text-center text-dim text-xs font-body py-8 px-4">
                  {search ? 'No results' : 'No conversations yet.\nStart a DM or create a group!'}
                </div>
              )}
              {filtered.map(ch => {
                const isDM     = ch.type === 'direct';
                const name     = isDM ? ch.dm_partner?.username : ch.name;
                const isActive = activeChannel?.id === ch.id;
                const unread   = unreadCounts[ch.id] || 0;
                const ts       = ch.updated_at
                  ? formatDistanceToNow(new Date(ch.updated_at), { addSuffix: false }) : '';
                return (
                  <button key={ch.id} onClick={() => { setActiveChannel(ch); onNavigate?.(); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl
                      text-left transition-all duration-150
                      ${isActive
                        ? 'bg-accent/10 border border-accent/20'
                        : 'hover:bg-surface border border-transparent'}`}>
                    {isDM ? (
                      <Avatar user={ch.dm_partner} size="md" showOnline />
                    ) : (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center
                        flex-shrink-0 border border-border
                        ${isActive ? 'bg-accent/20' : 'bg-surface'}`}>
                        {ch.type === 'public'
                          ? <Hash size={14} className="text-dim" />
                          : <Lock size={12} className="text-dim" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm font-display font-600 truncate
                          ${isActive ? 'text-accent' : 'text-text'}`}>
                          {name}
                        </span>
                        <span className="text-dim text-[10px] font-mono flex-shrink-0">{ts}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className={`text-xs font-body truncate
                          ${unread > 0 ? 'text-text font-500' : 'text-dim'}`}>
                          {getPreview(ch)}
                        </p>
                        {unread > 0 && (
                          <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-accent
                            text-void text-[10px] font-display font-700 rounded-full
                            flex items-center justify-center px-1">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── FRIENDS TAB ── */}
        {activeTab === 'friends' && (
          <>
            <div className="px-4 py-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                <input value={friendSearch} onChange={e => setFriendSearch(e.target.value)}
                  placeholder="Search friends…"
                  className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-xs
                    font-body text-text placeholder:text-muted focus:outline-none
                    focus:border-accent/50 transition-all" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-dim text-sm font-body">
                    {friendSearch ? 'No friends found' : 'No friends yet'}
                  </p>
                  {!friendSearch && (
                    <p className="text-muted text-xs font-body mt-1">
                      Go to Chats → DM to add friends
                    </p>
                  )}
                </div>
              ) : filteredFriends.map(f => (
                <div key={f.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                    hover:bg-surface transition-all group">
                  <Avatar user={f} size="md" showOnline />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-600 text-text">{f.username}</p>
                    <p className={`text-[10px] font-mono
                      ${f.is_online ? 'text-emerald-400' : 'text-dim'}`}>
                      {f.is_online ? '● Online' : '○ Offline'}
                    </p>
                  </div>
                  <button onClick={() => startDM(f)} disabled={creating}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1
                      bg-accent text-void text-xs font-display font-700 px-2.5 py-1.5
                      rounded-lg transition-all hover:bg-accentDim disabled:opacity-40">
                    <MessageSquare size={11} /> Chat
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* User footer */}
        <div className="px-4 py-3 border-t border-border flex items-center gap-3">
          <button onClick={() => setShowProfile(true)}
            className="flex-shrink-0 hover:opacity-80 transition-opacity">
            <Avatar user={user} size="sm" showOnline />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-600 text-text truncate">{user?.username}</p>
            <p className="text-[10px] font-mono text-accent">● Online</p>
          </div>
          <button onClick={logout}
            className="text-dim hover:text-pulse transition-colors p-1 rounded-lg hover:bg-surface"
            title="Logout">
            <LogOut size={14} />
          </button>
        </div>

        {/* DM / Group Modal */}
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={closeModal} />
            <div className="relative bg-panel border border-border rounded-2xl p-6 w-full
              max-w-sm animate-fade-up glow-accent">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-700 text-text">
                  {modal === 'dm' ? 'New Direct Message' : 'Create Group'}
                </h3>
                <button onClick={closeModal} className="text-dim hover:text-text transition-colors">
                  <X size={16} />
                </button>
              </div>

              {modal === 'group' && (
                <div className="mb-4">
                  <label className="block text-xs font-display font-600 text-dim
                    uppercase tracking-widest mb-2">Group Name</label>
                  <input value={groupName} onChange={e => setGroupName(e.target.value)}
                    placeholder="e.g. Team Alpha"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5
                      text-sm font-body text-text placeholder:text-muted focus:outline-none
                      focus:border-accent/50 transition-all" />
                </div>
              )}

              <div>
                <label className="block text-xs font-display font-600 text-dim
                  uppercase tracking-widest mb-2">
                  {modal === 'dm' ? 'Find User' : 'Add Members'}
                </label>
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by username…"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5
                    text-sm font-body text-text placeholder:text-muted focus:outline-none
                    focus:border-accent/50 transition-all mb-2" />

                {modal === 'group' && selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedUsers.map(u => (
                      <span key={u.id} className="flex items-center gap-1 bg-accent/10
                        border border-accent/20 rounded-full px-2.5 py-1 text-xs
                        text-accent font-display font-600">
                        {u.username}
                        <button onClick={() => setSelectedUsers(p => p.filter(x => x.id !== u.id))}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {userResults.map(u => {
                    const status     = requestStatus[u.id] || u.friend_status;
                    const isFriend   = status === 'friends';
                    const statusInfo = getStatusLabel(status);
                    return (
                      <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl
                        hover:bg-surface transition-all">
                        <Avatar user={u} size="sm" showOnline />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-display font-600 text-text">{u.username}</p>
                          {statusInfo && (
                            <p className={`text-[10px] font-mono ${statusInfo.color}`}>
                              {statusInfo.label}
                            </p>
                          )}
                        </div>
                        {modal === 'dm' ? (
                          isFriend ? (
                            <button onClick={() => startDM(u)}
                              className="flex items-center gap-1 bg-accent text-void text-xs
                                font-display font-700 px-2.5 py-1.5 rounded-lg
                                hover:bg-accentDim transition-all">
                              <MessageSquare size={11} /> Chat
                            </button>
                          ) : (
                            <button onClick={() => sendFriendRequest(u)}
                              disabled={status === 'pending_sent'}
                              className={`flex items-center gap-1 text-xs font-display
                                font-700 px-2.5 py-1.5 rounded-lg transition-all
                                ${status === 'pending_sent'
                                  ? 'bg-surface text-dim border border-border cursor-not-allowed'
                                  : 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20'}`}>
                              <UserPlus size={11} />
                              {status === 'pending_sent' ? 'Sent' : 'Add Friend'}
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => setSelectedUsers(p =>
                              p.find(x => x.id === u.id) ? p : [...p, u])}
                            className="text-dim hover:text-accent transition-colors">
                            {selectedUsers.find(x => x.id === u.id)
                              ? <Check size={14} className="text-accent" />
                              : <Plus size={14} />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {modal === 'dm' && userResults.length === 0 && userSearch.length >= 2 && (
                    <p className="text-center text-dim text-xs font-body py-4">No users found</p>
                  )}
                  {modal === 'dm' && userSearch.length < 2 && (
                    <p className="text-center text-muted text-xs font-body py-4">
                      Type at least 2 characters to search
                    </p>
                  )}
                </div>
              </div>

              {modal === 'group' && (
                <button onClick={createGroup} disabled={creating || !groupName.trim()}
                  className="w-full mt-4 bg-accent hover:bg-accentDim text-void font-display
                    font-600 py-2.5 rounded-xl transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed">
                  {creating ? 'Creating…' : 'Create Group'}
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showFriends && (
        <FriendsPanel
          onClose={() => { setShowFriends(false); loadPendingCount(); }}
          onStartDM={startDM}
        />
      )}
    </>
  );
}