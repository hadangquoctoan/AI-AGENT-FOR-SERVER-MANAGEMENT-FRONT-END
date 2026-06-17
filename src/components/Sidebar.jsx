import React from 'react';
import { Terminal, Shield, MessageSquare, AlertCircle, Cpu, Server, X } from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const quickPrompts = [
    { icon: <AlertCircle size={16} />, text: 'Nginx 502 error', prompt: 'How do I diagnose an Nginx 502 Bad Gateway error?' },
    { icon: <Server size={16} />, text: 'Disk usage incident', prompt: 'The server disk is almost full. Give me a safe diagnostic and cleanup procedure.' },
    { icon: <Cpu size={16} />, text: 'High CPU usage', prompt: 'Investigate high CPU usage on a Linux server and provide commands in order.' },
    { icon: <Terminal size={16} />, text: 'SSH connection refused', prompt: 'SSH connections are being refused. What should I check first?' },
  ];

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear chat history?")) {
      await fetch('/api/history', { method: 'DELETE' });
      window.location.reload();
    }
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 glass-panel border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      
      {/* Brand Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Terminal size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-zinc-100 tracking-tight">OpsPilot</h1>
            <p className="text-xs text-zinc-400 font-medium">Server intelligence</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="mb-2 px-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick investigations</h2>
          <div className="space-y-1">
            {quickPrompts.map((item, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  // Need to pass this down or handle state globally
                  // For now, it just shows up in the sidebar
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group cursor-pointer"
              >
                <div className="text-zinc-500 group-hover:text-indigo-400 transition-colors">
                  {item.icon}
                </div>
                <span className="truncate">{item.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/5">
        <button 
          onClick={handleClearHistory}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors mb-4"
        >
          <MessageSquare size={16} />
          <span>Clear local history</span>
        </button>
        
        <div className="flex items-start space-x-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5">
          <Shield size={16} className="text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-zinc-300">Stored locally</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Chat history stays on this machine.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
