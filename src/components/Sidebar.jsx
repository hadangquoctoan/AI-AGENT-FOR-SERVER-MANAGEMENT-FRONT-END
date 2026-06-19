import React, { useState } from 'react';
import {
  MessageSquare, LayoutDashboard, Database, Shield, Zap, CircleDot, RefreshCw,
  Terminal, X, Plus, AlertCircle, Cpu, HardDrive, Wifi, Activity, ChevronRight,
} from 'lucide-react';

// ─── Quick-prompt presets ───────────────────────────────────────────────────
const QUICK_PROMPTS = [
  {
    icon: <AlertCircle size={14} />,
    label: 'Nginx 502',
    color: 'text-zinc-300',
    prompt: 'How do I diagnose an Nginx 502 Bad Gateway error? Walk me through the evidence-first troubleshooting steps.',
  },
  {
    icon: <HardDrive size={14} />,
    label: 'Disk almost full',
    color: 'text-zinc-300',
    prompt: 'The server disk is critically low. Give me a safe diagnostic and cleanup procedure without deleting important data.',
  },
  {
    icon: <Cpu size={14} />,
    label: 'High CPU spike',
    color: 'text-zinc-300',
    prompt: 'Investigate a sudden CPU spike on a Linux server. Provide commands in order and explain what each reveals.',
  },
  {
    icon: <Wifi size={14} />,
    label: 'SSH refused',
    color: 'text-zinc-300',
    prompt: 'SSH connections are being refused. What should I check first and what are the most common causes?',
  },
  {
    icon: <Database size={14} />,
    label: 'OOM / Memory',
    color: 'text-zinc-300',
    prompt: 'The server is experiencing Out-of-Memory (OOM) kills. How do I identify the memory hog and prevent recurrence?',
  },
  {
    icon: <Activity size={14} />,
    label: 'Slow response time',
    color: 'text-zinc-300',
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
          <p className="text-[10px] text-zinc-400 mt-0.5">{status.agent_info.rag_chunks} knowledge chunks loaded</p>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, setIsOpen, agentStatus, onQuickPrompt, activeTab, setActiveTab, onAddServer }) {

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
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
              <Terminal size={17} className="text-black" />
            </div>
            {/* Glow dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-background border-2 border-background flex items-center justify-center">
              {agentStatus.status === 'ok'
                ? <span className="w-1.5 h-1.5 rounded-full bg-white" />
                : agentStatus.status === 'starting'
                ? <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                : <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
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

          {/* App Navigation */}
          <section className="flex-1">
            <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-2 mb-2">
              Navigation
            </h2>
            <nav className="space-y-1">
              <button
                onClick={() => { setIsOpen(false); setActiveTab('chat'); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 group
                  ${activeTab === 'chat' 
                    ? 'bg-white/10 text-white shadow-sm' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <MessageSquare size={16} className={activeTab === 'chat' ? 'text-white' : 'text-zinc-500 group-hover:text-white transition-colors'} />
                Chat
              </button>

              <button
                onClick={() => { setIsOpen(false); setActiveTab('dashboard'); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 group
                  ${activeTab === 'dashboard' 
                    ? 'bg-white/10 text-white shadow-sm' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <LayoutDashboard size={16} className={activeTab === 'dashboard' ? 'text-white' : 'text-zinc-500 group-hover:text-white transition-colors'} />
                Server Dashboard
              </button>
            </nav>
          </section>

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
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2 shrink-0">
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
