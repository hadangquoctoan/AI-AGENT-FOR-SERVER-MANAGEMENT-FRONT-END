import React from 'react';
import { Menu, Activity, Bot, Cpu, Zap, Circle } from 'lucide-react';

// ─── Status badge shown in topbar ───────────────────────────────────────────
function StatusBadge({ status }) {
  if (status.status === 'ok') {
    const { provider = 'ai', model = '' } = status.agent_info ?? {};
    return (
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-medium text-white">
        <span className="status-dot-ok" />
        <span className="capitalize">{provider}</span>
        {model && <span className="text-zinc-400 font-mono">· {model}</span>}
      </div>
    );
  }
  if (status.status === 'starting') {
    return (
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs font-medium text-zinc-300">
        <span className="status-dot-starting" />
        <span>Initializing…</span>
      </div>
    );
  }
  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-medium text-zinc-500">
      <span className="status-dot-error" />
      <span>Backend offline</span>
    </div>
  );
}

export default function Topbar({ activeTab, setActiveTab, toggleSidebar, agentStatus }) {
  return (
    <header className="h-14 glass-header rounded-full border border-white/10 flex items-center justify-between px-4 z-30 shrink-0 min-w-[320px] shadow-2xl shadow-black/50 backdrop-blur-xl bg-zinc-950/60">
      {/* Left — hamburger + brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 -ml-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="hidden sm:flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg shadow-white/10">
            <Cpu size={14} className="text-black" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white uppercase tracking-widest leading-none mb-0.5">
              OpsPilot
            </p>
          </div>
        </div>
      </div>

      {/* Centre — tab switcher */}
      <nav className="flex items-center bg-zinc-900/90 p-1 rounded-full border border-white/[0.06] gap-1 mx-4">
        <button
          onClick={() => setActiveTab('assistant')}
          className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            activeTab === 'assistant'
              ? 'text-black bg-white shadow-lg shadow-white/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Bot size={13} />
          <span>Assistant</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            activeTab === 'logs'
              ? 'text-black bg-white shadow-lg shadow-white/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <div className="relative">
            <Activity size={13} />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400" />
          </div>
          <span>Live Logs</span>
        </button>
      </nav>

      {/* Right — status badge */}
      <StatusBadge status={agentStatus} />
    </header>
  );
}
