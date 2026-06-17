import React from 'react';
import { Menu, Activity, Bot } from 'lucide-react';

export default function Topbar({ activeTab, setActiveTab, toggleSidebar }) {
  return (
    <header className="h-16 glass-header flex items-center justify-between px-4 sm:px-6 z-30 shrink-0">
      <div className="flex items-center space-x-4">
        <button 
          onClick={toggleSidebar}
          className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <Menu size={20} />
        </button>
        
        <div className="hidden sm:block">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-0.5">Incident workspace</p>
          <h2 className="text-sm font-semibold text-zinc-100">Server Management Agent</h2>
        </div>
      </div>

      {/* Workspace Tabs */}
      <nav className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('assistant')}
          className={`relative flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'assistant' 
              ? 'text-white bg-white/10 shadow-sm' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Bot size={16} />
          <span>Assistant</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`relative flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'logs' 
              ? 'text-white bg-white/10 shadow-sm' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <div className="relative">
            <Activity size={16} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <span>Live Logs</span>
        </button>
      </nav>
    </header>
  );
}
