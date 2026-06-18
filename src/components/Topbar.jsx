import React from 'react';
import { Menu, Activity, Bot, Cpu, Zap, Circle } from 'lucide-react';

// ─── Status badge shown in topbar ───────────────────────────────────────────
function StatusBadge({ status }) {
  if (status.status === 'ok') {
    const { provider = 'ai', model = '' } = status.agent_info ?? {};
    return (
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
        <span className="status-dot-ok" />
        <span className="capitalize">{provider}</span>
        {model && <span className="text-emerald-600 font-mono">· {model}</span>}
      </div>
    );
  }
  if (status.status === 'starting') {
    return (
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
        <span className="status-dot-starting" />
        <span>Initializing…</span>
      </div>
    );
  }
  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">
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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Cpu size={14} className="text-white" />
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
              ? 'text-white bg-indigo-600/80 shadow-lg shadow-indigo-500/20'
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
              ? 'text-white bg-indigo-600/80 shadow-lg shadow-indigo-500/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <div className="relative">
            <Activity size={13} />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <span>Live Logs</span>
        </button>
      </nav>

      {/* Right — status badge */}
      <StatusBadge status={agentStatus} />
    </header>
  );
}
