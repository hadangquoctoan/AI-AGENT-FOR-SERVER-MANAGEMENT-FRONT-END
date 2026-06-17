import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, Square, Trash2 } from 'lucide-react';

export default function LogsViewer() {
  const [isPolling, setIsPolling] = useState(false);
  const [logQuery, setLogQuery] = useState('{job=~".+"}');
  const [logs, setLogs] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/logs?query=${encodeURIComponent(logQuery)}&limit=100`);
      const data = await res.json();
      if (data.status === 'ok' && data.lines) {
        // Loki logs usually come newer first, we reverse them to append at bottom
        const formatted = data.lines.reverse().map(l => {
          const timestamp = new Date(parseInt(l[0]) / 1000000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
          return { time: timestamp, content: l[1] };
        });
        setLogs(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  useEffect(() => {
    if (isPolling) {
      fetchLogs(); // initial fetch
      intervalRef.current = setInterval(fetchLogs, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPolling, logQuery]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const togglePolling = () => setIsPolling(!isPolling);
  const clearLogs = () => setLogs([]);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Logs Header & Controls */}
      <div className="glass-header p-4 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Activity size={14} className="text-emerald-500" />
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Loki Observability</p>
            </div>
            <h2 className="text-lg font-semibold text-white">Live Server Logs</h2>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative glass border border-zinc-800 rounded-lg flex items-center px-3 py-1.5 focus-within:border-indigo-500/50 transition-colors">
              <span className="text-xs text-zinc-500 mr-2 font-mono">LogQL</span>
              <input
                type="text"
                value={logQuery}
                onChange={(e) => setLogQuery(e.target.value)}
                disabled={isPolling}
                className="bg-transparent border-none text-zinc-200 text-sm font-mono focus:ring-0 w-48 sm:w-64 p-0 placeholder-zinc-700 disabled:opacity-50"
                placeholder='{job="systemd"}'
              />
            </div>
            
            <button
              onClick={togglePolling}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                isPolling 
                  ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20' 
                  : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20'
              }`}
              title={isPolling ? "Stop stream" : "Start stream"}
            >
              {isPolling ? <Square size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-0.5" />}
            </button>
            
            <button
              onClick={clearLogs}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors"
              title="Clear logs"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Logs Meta */}
      <div className="bg-zinc-900/50 border-b border-white/5 py-1.5 px-4 flex justify-between items-center text-xs text-zinc-500 font-medium z-10">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isPolling ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></span>
            {isPolling ? 'Streaming active' : 'Paused'}
          </span>
          <span>{logs.length} lines</span>
        </div>
        <label className="flex items-center space-x-2 cursor-pointer hover:text-zinc-300 transition-colors">
          <input 
            type="checkbox" 
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950" 
          />
          <span>Auto-scroll</span>
        </label>
      </div>

      {/* Logs Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-sm bg-[#0a0a0a] p-4">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
            <Activity size={32} className="opacity-20" />
            <p>No logs loaded. Click play to start streaming.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex hover:bg-white/5 px-2 py-0.5 rounded transition-colors group">
                <span className="text-zinc-600 mr-4 select-none w-20 shrink-0">{log.time}</span>
                <span className="text-zinc-300 break-all">{log.content}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
