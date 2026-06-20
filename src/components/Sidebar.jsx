import React, { useState } from 'react';
import {
  MessageSquare, LayoutDashboard, Database, Shield, Zap, CircleDot, RefreshCw,
  Terminal, X, Plus, AlertCircle, Cpu, HardDrive, Wifi, Activity, ChevronRight, User
} from 'lucide-react';



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

export default function Sidebar({ isOpen, setIsOpen, agentStatus, activeTab, setActiveTab, onAddServer, sessions = [], currentSessionId, onSelectSession, onNewChat }) {

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
                onClick={onNewChat}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 group bg-white text-black hover:bg-zinc-200 shadow-md mb-2"
              >
                <div className="flex items-center gap-2">
                  <Plus size={14} className="text-black" />
                  New Chat
                </div>
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

          {/* Chat History */}
          <section>
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                Chat History
              </h2>
              <button
                onClick={onNewChat}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                title="New Chat"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-0.5">
              {sessions.map((session) => (
                <button
                  key={session.sessionId}
                  onClick={() => { setIsOpen(false); onSelectSession(session.sessionId); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 group text-left
                    ${currentSessionId === session.sessionId
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <MessageSquare size={14} className={`shrink-0 ${currentSessionId === session.sessionId ? 'text-white' : 'text-zinc-600 group-hover:text-white transition-colors'}`} />
                  <span className="truncate">{session.title || 'New Chat Session'}</span>
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="text-[10px] text-zinc-600 px-3 py-2">No conversations yet.</p>
              )}
            </div>
          </section>

      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2 shrink-0">
        {/* Agent status card */}
        <AgentStatusCard status={agentStatus} />

        {/* User Info */}
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.04]">
          <User size={12} className="text-zinc-600 mt-0.5 shrink-0" />
          <div className="text-[10px] text-zinc-600 leading-relaxed overflow-hidden">
            Logged in as <span className="font-bold text-zinc-400 truncate block">{localStorage.getItem('email') || 'Unknown User'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
