import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Server, Plus, Loader2, Check, Terminal, Copy, AlertCircle, ArrowLeft, Activity, Shield } from 'lucide-react';
import ChatArea from './ChatArea';
import RegisterServerModal from './RegisterServerModal';
import WebTerminal from './WebTerminal';
import { BorderGlow } from './lazy-ui/border-glow';

const ServerMetricsCard = ({ server }) => {
  const [metrics, setMetrics] = useState({
    status: 'PENDING',
    cpuPercent: 0,
    ramPercent: 0,
    diskPercent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/servers/${server.serverId}/metrics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error('Failed to fetch metrics for server', server.serverId, err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // 1 minute polling
    return () => clearInterval(interval);
  }, [server.serverId]);

  const isOnline = metrics.status === 'ONLINE';

  return (
    <>
      <div className="flex justify-between text-sm">
        <span className="text-zinc-500">Status</span>
        <span className={`uppercase text-xs font-bold tracking-wider ${isOnline ? 'text-green-400' : (metrics.status === 'OFFLINE' ? 'text-red-400' : 'text-yellow-400')}`}>
          {metrics.status}
        </span>
      </div>
      
      {/* Spacer between IP/Status and Metrics */}
      <div className="h-6"></div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-black/40 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center transition-colors group-hover:bg-black/60">
          <span className="text-xs text-zinc-500 font-medium mb-1">CPU</span>
          <span className="text-sm font-bold text-white flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-blue-500 animate-pulse' : 'bg-zinc-600'}`} /> 
            {loading ? '--' : `${metrics.cpuPercent?.toFixed(1)}%`}
          </span>
        </div>
        <div className="bg-black/40 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center transition-colors group-hover:bg-black/60">
          <span className="text-xs text-zinc-500 font-medium mb-1">RAM</span>
          <span className="text-sm font-bold text-white flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-purple-500 animate-pulse' : 'bg-zinc-600'}`} /> 
            {loading ? '--' : `${metrics.ramPercent?.toFixed(1)}%`}
          </span>
        </div>
        <div className="bg-black/40 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center transition-colors group-hover:bg-black/60">
          <span className="text-xs text-zinc-500 font-medium mb-1">DISK</span>
          <span className="text-sm font-bold text-white flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-zinc-600'}`} /> 
            {loading ? '--' : `${metrics.diskPercent?.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </>
  );
};export default function ServerDashboard() {
  const [servers, setServers] = useState([]);
  const [isLoadingServers, setIsLoadingServers] = useState(true);
  const [selectedServer, setSelectedServer] = useState(null);
  const [activeTab, setActiveTab] = useState('console'); // 'console' | 'logs'
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const logsEndRef = useRef(null);

  const containerRef = useRef(null);

  useEffect(() => {
    // Removed GSAP transform to prevent fixed modal from being trapped in a stacking context
    if (containerRef.current) {
      containerRef.current.style.opacity = 1;
      containerRef.current.style.transform = 'none';
    }
  }, []);

  const fetchServers = async () => {
    setIsLoadingServers(true);
    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');
      if (!userId || !token) return [];
      const res = await fetch(`/api/servers/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServers(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch servers", err);
    } finally {
      setIsLoadingServers(false);
    }
    return [];
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const terminalRef = useRef(null);
  const chatRef = useRef(null);

  const handleAIExecuteCommand = (cmd) => {
    setActiveTab('console');
    if (terminalRef.current) {
      terminalRef.current.executeCommand(cmd);
    }
  };

  const handleCommandOutput = (cmd, output, error) => {
    if (chatRef.current) {
      const fullOutput = `${output || ''}\n${error || ''}`.trim();
      chatRef.current.sendSystemResult(cmd, fullOutput);
    }
  };

  // Fetch Logs from Backend API
  const fetchServerLogs = async () => {
    if (!selectedServer?.serverId) return;
    setIsLoadingLogs(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${selectedServer.serverId}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'SUCCESS' && data.rawLogs) {
          const allLogs = data.rawLogs.map(rawString => {
            // Parse nano-second timestamp at the beginning of the string: [1781950060996860000] text...
            const match = rawString.match(/^\[(\d+)\]\s+(.*)/);
            if (match) {
              return {
                timestamp: parseInt(match[1]) / 1000000, // convert ns to ms
                text: match[2]
              };
            }
            return { timestamp: Date.now(), text: rawString };
          });
          allLogs.sort((a, b) => a.timestamp - b.timestamp);
          setLogs(allLogs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch server logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    let interval;
    if (selectedServer && activeTab === 'logs') {
      fetchServerLogs();
      interval = setInterval(fetchServerLogs, 10000); // poll every 10s as per suggestion
    }
    return () => clearInterval(interval);
  }, [selectedServer, activeTab]);

  useEffect(() => {
    if (activeTab === 'logs') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  if (selectedServer) {
    const hostname = selectedServer?.hostname || 'server';
    return (
      <div className="w-full h-full flex flex-col p-4 md:p-8 pt-24 space-y-6 overflow-hidden">
        {/* Header Console Mode */}
        <div className="flex justify-between items-center bg-zinc-900/50 border border-white/5 p-4 rounded-2xl backdrop-blur-md shrink-0 shadow-xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setSelectedServer(null); }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Terminal size={18} className="text-green-400" /> {hostname}
              </h2>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{selectedServer.ipAddress} • {selectedServer.status}</p>
            </div>
          </div>
          <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setActiveTab('console')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'console' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              Console
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              Activity Logs {isLoadingLogs && <Loader2 size={12} className="animate-spin" />}
            </button>
          </div>
        </div>

        {/* Console/Logs Split Screen */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Left Side: Interactive Ubuntu Terminal */}
          <div className="lg:w-[70%] h-full rounded-xl overflow-hidden border border-[#2c001e] shadow-2xl relative bg-[#300a24] flex flex-col">
            {/* Terminal title bar */}
            <div className="h-9 bg-[#3d3d3d] flex items-center px-4 shrink-0 border-b border-black/50 gap-2 justify-between">
              <div className="flex gap-1.5 items-center">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                <span className="text-zinc-300 text-xs font-bold font-mono ml-2">
                  {activeTab === 'console' ? `root@${hostname}: ~` : `Promtail Logs: ${hostname}`}
                </span>
              </div>
            </div>

            {/* Content area */}
            {activeTab === 'console' ? (
              <div className="flex-1 overflow-hidden relative">
                <WebTerminal 
                   ref={terminalRef} 
                   serverId={selectedServer?.serverId} 
                   onCommandOutput={handleCommandOutput}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed bg-[#1e1e1e]">
                {logs.length === 0 ? (
                  <div className="text-zinc-500 italic">No logs found or waiting for Promtail...</div>
                ) : (
                  logs.map((log, i) => {
                    const d = new Date(log.timestamp);
                    const timeStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
                    
                    let textColor = "text-zinc-300";
                    const lowerText = log.text.toLowerCase();
                    if (lowerText.includes("error") || lowerText.includes("fail") || lowerText.includes("fatal")) {
                      textColor = "text-red-400 font-semibold";
                    } else if (lowerText.includes("warn")) {
                      textColor = "text-yellow-400";
                    } else if (lowerText.includes("success") || lowerText.includes("started")) {
                      textColor = "text-green-400";
                    }

                    return (
                      <div key={i} className="whitespace-pre-wrap break-all mb-1 hover:bg-white/5 px-1 rounded transition-colors flex">
                        <span className="text-blue-400 mr-3 shrink-0">[{timeStr}]</span>
                        <span className={textColor}>{log.text}</span>
                      </div>
                    );
                  })
                )}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>

          {/* Right Side: AI Chat Box */}
          <div className="lg:w-[30%] h-full rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/80 backdrop-blur-md shadow-2xl flex flex-col">
            <div className="p-3 border-b border-white/10 bg-zinc-950 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <Activity size={14} className="text-blue-400" /> AI Assistant
                </h3>
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden flex flex-col w-full max-w-full">
               <ChatArea 
                 ref={chatRef} 
                 compact={true} 
                 onExecuteCommand={handleAIExecuteCommand} 
               />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col p-4 md:p-8 pt-24 space-y-6 overflow-y-auto">
      {/* ── Top Header & Register Section ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/50 border border-white/5 p-6 rounded-3xl backdrop-blur-md shrink-0 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/[0.03] rounded-full blur-[80px] pointer-events-none" />
        
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Server className="text-zinc-400" /> Your Server Fleet
          </h2>
          <p className="text-sm text-zinc-400 font-light mt-1">
            {isLoadingServers ? 'Loading servers...' : `You are currently managing ${servers.filter(s => s.status === 'SUCCESS').length} server(s).`}
          </p>
        </div>

        <button 
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-full hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
        >
          <Plus size={18} /> REGISTER NEW SERVER
        </button>
      </div>

      {/* ── Server List ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingServers ? (
          <div className="col-span-full py-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-zinc-500" />
          </div>
        ) : servers.filter(s => s.status === 'SUCCESS').length === 0 ? (
          <div className="col-span-full bg-zinc-900/30 border border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
            <Shield size={48} className="text-zinc-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No servers connected</h3>
            <p className="text-zinc-400 max-w-md">You don't have any active servers yet. Click "Register New Server" to deploy your first agent.</p>
          </div>
        ) : (
          servers.filter(s => s.status === 'SUCCESS').map(server => (
            <BorderGlow 
              key={server.serverId} 
              mode="auto"
              palette="aurora"
              thickness={1.5}
              radius={24}
              coneSpread={22}
              glowSize={16}
              intensity={0.8}
              speed={1}
              cursorRadius={120}
              sparkleCount={14}
              bling={true}
              background="rgba(24, 24, 27, 0.7)"
              onClick={() => setSelectedServer(server)}
              className="transition-all cursor-pointer group shadow-lg"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${server.status === 'SUCCESS' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'}`} />
                  <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                    {server.hostname !== 'Unknown' ? server.hostname : 'Unnamed Node'}
                  </h3>
                </div>
                <Server size={20} className="text-zinc-500" />
              </div>
              
              <div className="space-y-2 mb-2">
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-zinc-500">IP Address</span>
                  <span className="text-zinc-300 font-mono">{server.ipAddress}</span>
                </div>
              </div>

              <ServerMetricsCard server={server} />

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveTab('console'); setSelectedServer(server); }}
                  className="flex items-center text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  <Terminal size={14} className="mr-2" /> Console
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveTab('logs'); setSelectedServer(server); }}
                  className="flex items-center text-sm font-bold text-zinc-400 hover:text-blue-400 transition-colors"
                >
                  <Activity size={14} className="mr-2" /> Logs
                </button>
              </div>
              </div>
            </BorderGlow>
          ))
        )}
      </div>

      {showRegisterModal && (
        <RegisterServerModal 
          onClose={() => { setShowRegisterModal(false); fetchServers(); }} 
          onCompleteRegistration={async (apiKey) => {
            setShowRegisterModal(false);
            const updatedServers = await fetchServers();
            const newSrv = updatedServers.find(s => s.agentApiKey === apiKey);
            if (newSrv) {
              setSelectedServer(newSrv);
            }
          }}
        />
      )}
    </div>
  );
}
