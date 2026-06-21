import React, { useState } from 'react';
import {
  MessageSquare, LayoutDashboard, Server, Shield, Terminal, X, Plus, User, LogOut, Trash2, Zap, Activity
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

export default function Sidebar({ 
  isOpen, setIsOpen, agentStatus, activeTab, setActiveTab, 
  chatMode, setChatMode, // TERMINAL | GENERAL
  sessions = [], currentSessionId, onSelectSession, 
  onNewChat, onLogout, onDeleteSession,
  terminalServers = [], onSelectServer, // servers for TERMINAL mode
  terminalSessions = [], onSelectTerminalSession // terminal chat history sessions
}) {

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

      {/* ── Mode Tabs: TERMINAL / GENERAL ─────────────────────────────── */}
      <div className="px-3 pt-4 pb-2 shrink-0">
        <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setChatMode('TERMINAL')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
              chatMode === 'TERMINAL'
                ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/10'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            <Terminal size={14} />
            TERMINAL
          </button>
          <button
            onClick={() => setChatMode('GENERAL')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
              chatMode === 'GENERAL'
                ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            <MessageSquare size={14} />
            GENERAL
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-4">

        {/* ── TERMINAL MODE ──────────────────────────────────────────────── */}
        {chatMode === 'TERMINAL' && (
          <section className="space-y-3">
            {/* Active Servers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 mb-1">
                <h2 className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Terminal size={10} />
                  Active Servers
                </h2>
              </div>
              {terminalServers.length === 0 ? (
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-center">
                  <Server size={24} className="text-zinc-700 mx-auto mb-2" />
                  <p className="text-[11px] text-zinc-500">No servers registered.</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Go to Server Dashboard to add servers.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {terminalServers.map((server) => (
                    <button
                      key={server.serverId}
                      onClick={() => {
                        setActiveTab('dashboard');
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-900/50 border border-white/5 hover:bg-white/5 hover:border-green-500/30 transition-all group text-left"
                    >
                      <div className={`w-2 h-2 rounded-full ${server.status === 'SUCCESS' ? 'bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-zinc-600'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                          {server.hostname !== 'Unknown' ? server.hostname : 'Unnamed Node'}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono truncate">{server.ipAddress}</p>
                      </div>
                      <Terminal size={12} className="text-zinc-600 group-hover:text-green-400 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => { setActiveTab('dashboard'); setIsOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/10 text-[11px] text-zinc-500 hover:text-zinc-300 hover:border-white/20 transition-all"
              >
                <LayoutDashboard size={12} />
                Manage Servers
              </button>
            </div>

            {/* Terminal Chat History */}
            {terminalSessions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity size={10} />
                    Terminal History
                  </h2>
                </div>
                <div className="space-y-0.5">
                  {terminalSessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className="w-full flex items-center justify-between px-1 py-1 rounded-xl transition-all duration-200 group"
                    >
                      <button
                        onClick={() => onSelectTerminalSession && onSelectTerminalSession(session)}
                        className="flex-1 flex items-center gap-3 px-2 py-1.5 text-xs font-medium truncate text-left text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Terminal size={14} className="text-green-500/50 shrink-0" />
                        <span className="truncate">{session.title || 'Terminal Session'}</span>
                      </button>
                      {onDeleteSession && (
                        <button
                          onClick={(e) => onDeleteSession(e, session.sessionId)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Delete Chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── GENERAL MODE ───────────────────────────────────────────────── */}
        {chatMode === 'GENERAL' && (
          <>
            {/* New Chat */}
            <section>
              <button
                onClick={onNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 shadow-md transition-all mb-2"
              >
                <Plus size={14} />
                New Chat
              </button>
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
                  <div 
                    key={session.sessionId} 
                    className={`w-full flex items-center justify-between px-1 py-1 rounded-xl transition-all duration-200 group ${currentSessionId === session.sessionId ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/5'}`}
                  >
                    <button
                      onClick={() => { setIsOpen(false); onSelectSession(session.sessionId); }}
                      className={`flex-1 flex items-center gap-3 px-2 py-1.5 text-xs font-medium truncate text-left
                        ${currentSessionId === session.sessionId
                          ? 'text-white'
                          : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                      <MessageSquare size={14} className={`shrink-0 ${currentSessionId === session.sessionId ? 'text-blue-400' : 'text-zinc-600 group-hover:text-white transition-colors'}`} />
                      <span className="truncate">{session.title || 'New Chat Session'}</span>
                    </button>
                    {onDeleteSession && (
                      <button
                        onClick={(e) => onDeleteSession(e, session.sessionId)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Delete Chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-[10px] text-zinc-600 px-3 py-4 text-center">
                    No conversations yet.<br />
                    Start a new chat above.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2 shrink-0">
        {/* Agent status card */}
        <AgentStatusCard status={agentStatus} />

        {/* User Info */}
        <div className="group flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/60 border border-white/[0.04] transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-white/[0.05]">
              <User size={13} className="text-zinc-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider mb-0.5">Signed In</span>
              <span className="text-[11px] font-bold text-zinc-300 truncate">{localStorage.getItem('email') || 'Unknown User'}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all shrink-0 ml-2"
            title="Log out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
