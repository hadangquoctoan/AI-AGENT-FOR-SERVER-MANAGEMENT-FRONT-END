import React, { useState } from 'react';
import {
  Terminal, Shield, MessageSquare, AlertCircle, Cpu,
  Server, X, Plus, Activity, Trash2, RotateCcw,
  ChevronRight, Zap, HardDrive, Wifi, Database,
} from 'lucide-react';

// ─── Quick-prompt presets ───────────────────────────────────────────────────
const QUICK_PROMPTS = [
  {
    icon: <AlertCircle size={14} />,
    label: 'Nginx 502',
    color: 'text-rose-400',
    prompt: 'How do I diagnose an Nginx 502 Bad Gateway error? Walk me through the evidence-first troubleshooting steps.',
  },
  {
    icon: <HardDrive size={14} />,
    label: 'Disk almost full',
    color: 'text-amber-400',
    prompt: 'The server disk is critically low. Give me a safe diagnostic and cleanup procedure without deleting important data.',
  },
  {
    icon: <Cpu size={14} />,
    label: 'High CPU spike',
    color: 'text-sky-400',
    prompt: 'Investigate a sudden CPU spike on a Linux server. Provide commands in order and explain what each reveals.',
  },
  {
    icon: <Wifi size={14} />,
    label: 'SSH refused',
    color: 'text-purple-400',
    prompt: 'SSH connections are being refused. What should I check first and what are the most common causes?',
  },
  {
    icon: <Database size={14} />,
    label: 'OOM / Memory',
    color: 'text-emerald-400',
    prompt: 'The server is experiencing Out-of-Memory (OOM) kills. How do I identify the memory hog and prevent recurrence?',
  },
  {
    icon: <Activity size={14} />,
    label: 'Slow response time',
    color: 'text-indigo-400',
    prompt: 'My web service has very slow response times. What should I measure — CPU, memory, disk I/O, or network? Where do I start?',
  },
];

// ─── Status light in sidebar footer ─────────────────────────────────────────
function AgentStatusCard({ status }) {
  const isOk       = status.status === 'ok';
  const isStarting = status.status === 'starting';

  const dotClass = isOk ? 'status-dot-ok' : isStarting ? 'status-dot-starting' : 'status-dot-error';
  const label    = isOk
    ? `${status.agent_info?.provider ?? 'AI'} · ${status.agent_info?.model ?? ''}`
    : isStarting ? 'Initializing agent…'
    : status.message ?? 'Backend offline';

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/[0.05]">
      <div className="mt-0.5 shrink-0">
        <span className={dotClass} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-zinc-300 leading-tight">
          {isOk ? 'Agent ready' : isStarting ? 'Starting up' : 'Agent offline'}
        </p>
        <p className="text-[10px] text-zinc-500 mt-0.5 truncate font-mono">{label}</p>
        {isOk && status.agent_info?.rag_chunks != null && (
          <p className="text-[10px] text-indigo-400/70 mt-0.5">{status.agent_info.rag_chunks} knowledge chunks loaded</p>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, setIsOpen, agentStatus, onQuickPrompt, activeTab, setActiveTab }) {
  const [clearLoading, setClearLoading] = useState(false);

  // ── Clear history + memory (DELETE /api/history) ────────────────────────
  const handleClearAll = async () => {
    if (!confirm('Clear all chat history and AI memory? This cannot be undone.')) return;
    setClearLoading(true);
    try {
      await fetch('/api/history', { method: 'DELETE' });
      window.location.reload();
    } catch (err) {
      console.error('Clear history failed:', err);
      alert('Failed to clear history. Is the backend running?');
    } finally {
      setClearLoading(false);
    }
  };

  // ── Clear memory only (POST /api/clear_memory) ──────────────────────────
  const handleClearMemory = async () => {
    try {
      await fetch('/api/clear_memory', { method: 'POST' });
      // visual feedback only — no page reload
      alert('AI conversation memory cleared. Chat history is preserved.');
    } catch (err) {
      console.error('Clear memory failed:', err);
    }
  };

  // ── Fire a quick-prompt ─────────────────────────────────────────────────
  const handlePrompt = (prompt) => {
    setIsOpen(false); // close mobile sidebar
    onQuickPrompt(prompt);
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-72 glass-panel border-r border-white/[0.06]
        flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Terminal size={17} className="text-white" />
            </div>
            {/* Glow dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-background border-2 border-background flex items-center justify-center">
              {agentStatus.status === 'ok'
                ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                : agentStatus.status === 'starting'
                ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                : <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              }
            </span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 tracking-tight">OpsPilot</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Server Intelligence</p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-5">

        {/* New Chat button */}
        <button
          onClick={() => { setIsOpen(false); setActiveTab('assistant'); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                     bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20
                     hover:border-indigo-500/40 text-indigo-300 text-sm font-medium
                     transition-all duration-200 group"
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform duration-200" />
          New conversation
        </button>

        {/* Quick prompts */}
        <section>
          <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-2 mb-2">
            Quick Investigations
          </h2>
          <div className="space-y-0.5">
            {QUICK_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handlePrompt(item.prompt)}
                className="
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                  text-zinc-400 hover:text-white hover:bg-white/[0.04]
                  border border-transparent hover:border-white/[0.05]
                  transition-all duration-150 group text-left
                "
              >
                <span className={`shrink-0 ${item.color} transition-colors`}>{item.icon}</span>
                <span className="truncate text-xs font-medium">{item.label}</span>
                <ChevronRight
                  size={12}
                  className="ml-auto shrink-0 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all"
                />
              </button>
            ))}
          </div>
        </section>

        {/* Nav shortcuts */}
        <section>
          <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-2 mb-2">
            Workspace
          </h2>
          <div className="space-y-0.5">
            {[
              { tab: 'assistant', icon: <Zap size={14} />, label: 'AI Assistant' },
              { tab: 'logs',      icon: <Activity size={14} />, label: 'Live Logs' },
            ].map(({ tab, icon, label }) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setIsOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium
                  transition-all duration-150
                  ${activeTab === tab
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] border border-transparent'}
                `}
              >
                <span className={activeTab === tab ? 'text-indigo-400' : 'text-zinc-600'}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2 shrink-0">
        {/* Memory controls */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={handleClearMemory}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl
                       text-[11px] font-medium text-zinc-500 hover:text-zinc-300
                       hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]
                       transition-all"
            title="Clear AI short-term memory (keeps history)"
          >
            <RotateCcw size={12} />
            Reset memory
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearLoading}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl
                       text-[11px] font-medium text-rose-500/70 hover:text-rose-400
                       hover:bg-rose-500/[0.06] border border-transparent hover:border-rose-500/20
                       transition-all disabled:opacity-40"
            title="Delete all chat history and memory"
          >
            <Trash2 size={12} />
            {clearLoading ? 'Clearing…' : 'Clear all'}
          </button>
        </div>

        {/* Agent status card */}
        <AgentStatusCard status={agentStatus} />

        {/* Privacy note */}
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.04]">
          <Shield size={12} className="text-zinc-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            Chat history is stored locally on this machine only.
          </p>
        </div>
      </div>
    </aside>
  );
}
