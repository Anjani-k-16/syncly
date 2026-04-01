import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar.jsx';
import ChatWindow from '../components/chat/ChatWindow.jsx';
import { useSocket } from '../hooks/useSocket.js';
import { useChatStore } from '../store/chatStore.js';

export default function ChatPage() {
  useSocket();
  const { activeChannel } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-void overflow-hidden relative">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-void/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Mobile header bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3
          border-b border-border bg-panel/50 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(p => !p)}
            className="p-2 rounded-xl text-dim hover:text-text hover:bg-surface transition-all">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-display font-700 text-text text-base">
            {activeChannel
              ? (activeChannel.type === 'direct'
                  ? activeChannel.dm_partner?.username
                  : activeChannel.name)
              : 'Syncly'}
          </span>
        </div>

        <ChatWindow />
      </div>
    </div>
  );
}