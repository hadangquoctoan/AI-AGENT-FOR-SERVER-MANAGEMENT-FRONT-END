import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, RefreshCw, Terminal, Trash2 } from 'lucide-react';

function formatTime(raw) {
  if (!raw || raw === '—') return '—';
  const s = String(raw).trim();
  if (/^\d{1,2}:\d{2}/.test(s)) return s;
  const num = Number(s);
  if (isNaN(num)) return s.slice(0, 8);
  let ms;
  if (num > 1e15) ms = num / 1_000_000;
  else if (num > 1e12) ms = num / 1_000;
  else if (num > 1e9) ms = num;
  else ms = num * 1_000;
  return new Date(ms).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function normalizeLogItem(item) {
  if (Array.isArray(item) && item.length === 2) {
    const ns = parseInt(item[0]);
    const ts = isNaN(ns) ? '—' : new Date(ns / 1_000_000).toLocaleTimeString([], { hour12: false });
    const line = typeof item[1] === 'string' ? item[1] : JSON.stringify(item[1]);
    return { time: ts, content: line };
  }
  if (item && typeof item === 'object') {
    const content = item.content ?? item.message ?? item.line ?? item.text ?? item.log ?? JSON.stringify(item);
    const rawTime = item.time ?? item.timestamp ?? item.ts ?? '—';
    return { time: formatTime(rawTime), content: typeof content === 'string' ? content : JSON.stringify(content) };
  }
  return { time: '—', content: String(item) };
}

export default function LogsViewer({ serverName = 'server' }) {
  const [isPolling, setIsPolling] = useState(true);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const logsEndRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        query: '{job=~".+"}',
        limit: '100',
      });
      const res = await fetch(`/api/logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data.logs) ? data.logs : Array.isArray(data.lines) ? data.lines : [];
      setLogs(raw.map(normalizeLogItem));
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPolling) {
      fetchLogs();
      intervalRef.current = setInterval(fetchLogs, 3_000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPolling, fetchLogs]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden font-mono text-[13px] text-zinc-300 leading-snug">
      {/* Invisible header area just for hover controls to not obstruct text */}
      <div className="absolute top-2 right-4 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity z-10">
        <button onClick={fetchLogs} className="p-1.5 bg-black/50 hover:bg-white/20 rounded text-white" title="Refresh">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
        <button onClick={() => setIsPolling(!isPolling)} className="p-1.5 bg-black/50 hover:bg-white/20 rounded text-white" title={isPolling ? 'Stop streaming' : 'Start streaming'}>
          {isPolling ? <Square size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
        </button>
        <button onClick={() => setLogs([])} className="p-1.5 bg-black/50 hover:bg-white/20 rounded text-white" title="Clear">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-4">
        {logs.length === 0 ? (
          <div className="text-zinc-500 italic flex items-center gap-2">
            <Terminal size={14} /> Waiting for log stream... {error && <span className="text-rose-400 not-italic ml-2">Error: {error}</span>}
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 hover:bg-white/5 transition-colors px-1 rounded break-all">
                <span className="text-emerald-400 shrink-0">{log.time}</span>
                <span className="text-zinc-100 whitespace-pre-wrap">{log.content}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
        
        {/* Fake terminal prompt at the bottom */}
        <div className="flex gap-2 items-center mt-2 animate-pulse text-zinc-400">
          <span className="text-emerald-400 font-bold">ubuntu@{serverName}:~$</span>
          <span className="w-2 h-4 bg-zinc-300" />
        </div>
      </div>
    </div>
  );
}
