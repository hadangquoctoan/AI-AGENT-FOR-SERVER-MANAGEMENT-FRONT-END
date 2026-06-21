import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Server, Plus, Loader2, ArrowLeft, Activity, Shield, Terminal, Wrench } from 'lucide-react';
import ChatArea from './ChatArea';
import RegisterServerModal from './RegisterServerModal';
import WebTerminal from './WebTerminal';

// ─── Tools Showcase Panel ──────────────────────────────────────────────────────
const ToolsShowcase = ({ tools }) => {
  const [expanded, setExpanded] = useState(false);

  if (!tools || tools.length === 0) return null;

  const toolIcons = {
    execute_ssh_command: '⚡',
    fetch_server_status: '📊',
    execute_command: '💻',
    get_service_status: '🛠️',
    restart_service: '🔄',
    fetch_logs: '📋',
    list_running_processes: '📈',
  };

  const toolDescriptions = {
    execute_ssh_command: 'Thực thi lệnh SSH trên server (cần xác nhận)',
    fetch_server_status: 'Lấy thông số CPU, RAM, Disk',
    execute_command: 'Chạy lệnh shell tùy ý qua API',
    get_service_status: 'Kiểm tra trạng thái service (nginx, mysql...)',
    restart_service: 'Khởi động lại service trên server',
    fetch_logs: 'Lấy log hệ thống từ journalctl',
    list_running_processes: 'Danh sách tiến trình đang chạy',
  };

  const displayTools = expanded ? tools : tools.slice(0, 3);

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Wrench size={10} className="text-zinc-500" />
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
          AI Agent Tools
        </span>
        <span className="text-[10px] text-zinc-600 ml-auto">{tools.length} tools</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayTools.map((tool, i) => {
          const name = tool?.function?.name || 'unknown';
          return (
            <div
              key={i}
              title={toolDescriptions[name] || name}
              className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5 text-[10px] text-zinc-400 font-mono"
            >
              <span>{toolIcons[name] || '🔧'}</span>
              <span>{name}</span>
            </div>
          );
        })}
      </div>
      {tools.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          {expanded ? '▲ less' : `+${tools.length - 3} more`}
        </button>
      )}
    </div>
  );
};

// ─── Server Metrics Sub-card ─────────────────────────────────────────────────
const ServerMetricsCard = ({ server }) => {
  const [metrics, setMetrics] = useState({ status: 'PENDING', cpuPercent: 0, ramPercent: 0, diskPercent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/servers/${server.serverId}/metrics`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) setMetrics(await res.json());
      } catch (err) {
        console.error('Failed to fetch metrics for server', server.serverId, err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(interval);
  }, [server.serverId]);

  const isOnline = metrics.status === 'ONLINE';

  return (
    <>
      <div className="flex justify-between text-sm">
        <span className="text-zinc-500">Status</span>
        <span className={`uppercase text-xs font-bold tracking-wider ${
          isOnline ? 'text-green-400' : metrics.status === 'OFFLINE' ? 'text-red-400' : 'text-yellow-400'
        }`}>
          {metrics.status}
        </span>
      </div>
      <div className="h-6" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'CPU',  val: metrics.cpuPercent,  dot: 'bg-blue-500'   },
          { label: 'RAM',  val: metrics.ramPercent,  dot: 'bg-purple-500' },
          { label: 'DISK', val: metrics.diskPercent, dot: 'bg-green-500'  },
        ].map(({ label, val, dot }) => (
          <div key={label} className="bg-black/40 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center">
            <span className="text-xs text-zinc-500 font-medium mb-1">{label}</span>
            <span className="text-sm font-bold text-white flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? `${dot} animate-pulse` : 'bg-zinc-600'}`} />
              {loading ? '--' : `${val?.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ServerDashboard({
  onSessionUpdate,
  onServerListUpdate,
  initialServerId,
  initialSessionId,
  chatMode,
  globalSessionId,
  onGlobalSessionCreated,
  onChatDone,
  onSelectSession,
}) {
  const [servers, setServers]               = useState([]);
  const [isLoadingServers, setIsLoadingServers] = useState(true);
  const [selectedServer, setSelectedServer] = useState(null);
  const [viewTab, setViewTab]               = useState('console');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [logs, setLogs]                     = useState([]);
  const [isLoadingLogs, setIsLoadingLogs]   = useState(false);
  const [tools, setTools]                   = useState([]);
  const logsEndRef = useRef(null);
  const [serverSessionMap, setServerSessionMap] = useState({});
  const terminalRef = useRef(null);
  const chatRef     = useRef(null);

  const activeTerminalSessionId = selectedServer
    ? (serverSessionMap[selectedServer.serverId] ?? null)
    : null;

  // ── Fetch server list ──────────────────────────────────────────────────────
  const fetchServers = useCallback(async () => {
    setIsLoadingServers(true);
    try {
      const userId = localStorage.getItem('userId');
      const token  = localStorage.getItem('token');
      if (!userId || !token) return [];
      const res = await fetch(`/api/servers/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setServers(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch servers', err);
    } finally {
      setIsLoadingServers(false);
    }
    return [];
  }, []);

  // ── Fetch AI tools ──────────────────────────────────────────────────────────
  const fetchTools = useCallback(async () => {
    try {
      const res = await fetch('/api/tools');
      if (res.ok) {
        const data = await res.json();
        setTools(data.tools || []);
      }
    } catch (e) {
      console.warn('Failed to fetch tools:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchServers();
    fetchTools();
  }, [fetchServers, fetchTools]);

  // ── Pre-select server from sidebar ─────────────────────────────────────────
  useEffect(() => {
    if (!initialServerId || !servers.length) return;
    const srv = servers.find((s) => s.serverId === initialServerId);
    if (!srv) return;
    if (initialSessionId) {
      setServerSessionMap((prev) => ({ ...prev, [initialServerId]: initialSessionId }));
    }
    setSelectedServer(srv);
    onSessionUpdate({ serverId: null, sessionId: null });
  }, [initialServerId, initialSessionId, servers, onSessionUpdate]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleTerminalSessionCreated = useCallback((newSessionId) => {
    if (!selectedServer) return;
    setServerSessionMap((prev) => ({
      ...prev,
      [selectedServer.serverId]: newSessionId,
    }));
    if (onSessionUpdate) {
      onSessionUpdate({ serverId: selectedServer.serverId, sessionId: newSessionId });
    }
  }, [selectedServer, onSessionUpdate]);

  const handleAIExecuteCommand = (cmd) => {
    setViewTab('console');
    terminalRef.current?.executeCommand(cmd);
  };

  const handleCommandOutput = (cmd, output, error) => {
    const fullOutput = `${output || ''}\n${error || ''}`.trim();
    chatRef.current?.sendSystemResult(cmd, fullOutput);
  };

  const handleToolProposal = (proposal) => {
    terminalRef.current?.showProposal(proposal);
  };

  const handleApproveTool = (proposal) => {
    chatRef.current?.approveTool(proposal);
    terminalRef.current?.clearProposal();
  };

  const handleRejectTool = (proposal) => {
    chatRef.current?.rejectTool(proposal);
    terminalRef.current?.clearProposal();
  };

  const handleThinking = (data) => {
    terminalRef.current?.writeThinking(data.detail || data.step);
  };

  // ── Logs ───────────────────────────────────────────────────────────────────
  const fetchServerLogs = useCallback(async () => {
    if (!selectedServer?.serverId) return;
    setIsLoadingLogs(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${selectedServer.serverId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'SUCCESS' && data.rawLogs) {
          const parsed = data.rawLogs.map((rawString) => {
            const match = rawString.match(/^\[(\d+)\]\s+(.*)/);
            if (match) return { timestamp: parseInt(match[1]) / 1_000_000, text: match[2] };
            return { timestamp: Date.now(), text: rawString };
          });
          parsed.sort((a, b) => a.timestamp - b.timestamp);
          setLogs(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to fetch server logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [selectedServer?.serverId]);

  useEffect(() => {
    if (!selectedServer || viewTab !== 'logs') return;
    fetchServerLogs();
    const id = setInterval(fetchServerLogs, 10_000);
    return () => clearInterval(id);
  }, [selectedServer, viewTab, fetchServerLogs]);

  useEffect(() => {
    if (viewTab === 'logs') logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, viewTab]);

  const openServer = (server, tab = 'console') => {
    localStorage.setItem('selectedServerId', server.serverId);
    setSelectedServer(server);
    setViewTab(tab);
    setLogs([]);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: GENERAL chat mode (pass-through, no server selected)
  // ══════════════════════════════════════════════════════════════════════════
  if (chatMode === 'GENERAL') {
    return (
      <div className="flex-1 h-full">
        <ChatArea
          sessionId={globalSessionId}
          chatMode="GENERAL"
          onSessionCreated={onGlobalSessionCreated}
          onChatDone={onChatDone}
          onSelectSession={onSelectSession}
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: Selected server console
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedServer) {
    const hostname = selectedServer.hostname || 'server';
    return (
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar bg-[#0a0a0c]">

        {/* Header */}
        <div className="flex flex-col gap-3 bg-zinc-900/60 border border-white/10 p-4 rounded-2xl mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedServer(null)}
                className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal size={16} className="text-green-400" />
                  {hostname}
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  {selectedServer.ipAddress} · {selectedServer.status}
                </p>
              </div>
            </div>
            <div className="flex bg-black/50 p-1 rounded-lg border border-white/10 gap-1">
              <button
                onClick={() => setViewTab('console')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  viewTab === 'console' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                Console
              </button>
              <button
                onClick={() => setViewTab('logs')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${
                  viewTab === 'logs' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                Logs {isLoadingLogs && <Loader2 size={10} className="animate-spin" />}
              </button>
            </div>
          </div>
          <ToolsShowcase tools={tools} />
        </div>

        {/* Terminal + Chat side by side */}
        <div className="flex flex-1 flex-col lg:flex-row gap-4 min-h-0">

          {/* Left: Terminal */}
          <div className="lg:flex-1 rounded-xl overflow-hidden border border-[#2c001e] bg-[#300a24] flex flex-col" style={{ minHeight: '360px' }}>
            <div className="h-8 bg-[#3d3d3d] flex items-center px-3 border-b border-black/50 shrink-0">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <span className="text-zinc-300 text-xs font-mono ml-2">
                  {viewTab === 'console' ? `root@${hostname}` : `Logs: ${hostname}`}
                </span>
              </div>
            </div>
            {viewTab === 'console' ? (
              <div className="flex-1 overflow-hidden">
                <WebTerminal
                  ref={terminalRef}
                  serverId={selectedServer.serverId}
                  onCommandOutput={handleCommandOutput}
                  onThinking={handleThinking}
                  onApproveTool={handleApproveTool}
                  onRejectTool={handleRejectTool}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-zinc-300 bg-[#1e1e1e] custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-zinc-600">No logs found...</div>
                ) : logs.map((log, i) => (
                  <div key={i} className="mb-1 flex">
                    <span className="text-blue-400 mr-2 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={
                      log.text.toLowerCase().includes('error') || log.text.toLowerCase().includes('fail')
                        ? 'text-red-400'
                        : log.text.toLowerCase().includes('warn')
                        ? 'text-yellow-400'
                        : ''
                    }>{log.text}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>

          {/* Right: AI Chat */}
          <div className="lg:w-80 rounded-xl overflow-hidden border border-white/10 bg-zinc-900/80 flex flex-col" style={{ minHeight: '360px' }}>
            <div className="p-2 border-b border-white/10 bg-zinc-950 shrink-0">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Activity size={12} className="text-blue-400" />
                AI Assistant
                <span className="ml-auto text-[9px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">TERMINAL</span>
              </h3>
            </div>
            <div className="flex-1 min-h-0">
              <ChatArea
                ref={chatRef}
                compact={true}
                serverId={selectedServer.serverId}
                sessionId={activeTerminalSessionId}
                chatMode="TERMINAL"
                onSessionCreated={handleTerminalSessionCreated}
                onWriteToTerminal={(text) => terminalRef.current?.writeOutput(text)}
                onWriteRawToTerminal={(text) => terminalRef.current?.writeRaw(text)}
                onWritePromptToTerminal={() => terminalRef.current?.writePrompt()}
                onExecuteCommand={handleAIExecuteCommand}
                onThinking={handleThinking}
                onToolProposal={handleToolProposal}
              />
            </div>
          </div>
        </div>

        {showRegisterModal && (
          <RegisterServerModal
            onClose={() => { setShowRegisterModal(false); fetchServers(); onServerListUpdate?.(); }}
            onCompleteRegistration={async (apiKey) => {
              setShowRegisterModal(false);
              const updated = await fetchServers();
              onServerListUpdate?.();
              const newSrv = updated?.find((s) => s.agentApiKey === apiKey);
              if (newSrv) openServer(newSrv);
            }}
          />
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: Server fleet list (TERMINAL mode, no server selected)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar bg-[#0a0a0c]">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/60 border border-white/10 p-5 rounded-2xl mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server size={18} className="text-zinc-400" />
            Server Fleet
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {isLoadingServers
              ? 'Loading...'
              : `${servers.filter((s) => s.status === 'SUCCESS').length} server(s) connected`}
          </p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-full hover:bg-zinc-200 shrink-0"
        >
          <Plus size={16} />
          REGISTER SERVER
        </button>
      </div>

      {/* Server grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoadingServers ? (
          <div className="col-span-full py-12 flex justify-center">
            <Loader2 size={28} className="animate-spin text-zinc-500" />
          </div>
        ) : servers.filter((s) => s.status === 'SUCCESS').length === 0 ? (
          <div className="col-span-full bg-zinc-900/40 border border-white/10 rounded-2xl p-10 text-center">
            <Shield size={36} className="text-zinc-600 mx-auto mb-3" />
            <h3 className="text-white font-bold mb-2">No servers connected</h3>
            <p className="text-zinc-400 text-sm">Click "Register Server" to add your first server.</p>
          </div>
        ) : (
          servers.filter((s) => s.status === 'SUCCESS').map((server) => (
            <div
              key={server.serverId}
              className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 cursor-pointer hover:border-white/20 transition-colors"
              onClick={() => openServer(server)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    server.status === 'SUCCESS'
                      ? 'bg-green-500'
                      : 'bg-yellow-500'
                  }`} />
                  <h3 className="font-bold text-white">
                    {server.hostname !== 'Unknown' ? server.hostname : 'Unnamed'}
                  </h3>
                </div>
                <Server size={16} className="text-zinc-500" />
              </div>
              <div className="text-xs text-zinc-500 font-mono mb-4">{server.ipAddress}</div>
              <ServerMetricsCard server={server} />
              <div className="pt-3 border-t border-white/5 flex gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); openServer(server, 'console'); }}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  <Terminal size={12} /> Console
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openServer(server, 'logs'); }}
                  className="text-xs text-zinc-400 hover:text-blue-400 flex items-center gap-1"
                >
                  <Activity size={12} /> Logs
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showRegisterModal && (
        <RegisterServerModal
          onClose={() => { setShowRegisterModal(false); fetchServers(); onServerListUpdate?.(); }}
          onCompleteRegistration={async (apiKey) => {
            setShowRegisterModal(false);
            const updated = await fetchServers();
            onServerListUpdate?.();
            const newSrv = updated?.find((s) => s.agentApiKey === apiKey);
            if (newSrv) openServer(newSrv);
          }}
        />
      )}
    </div>
  );
}
