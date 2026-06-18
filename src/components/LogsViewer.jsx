import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity, Play, Square, Trash2, Search,
  AlertTriangle, Info, Bug, Terminal, RefreshCw, Settings2,
} from 'lucide-react';

// ─── Detect log level from content ───────────────────────────────────────────
function detectLevel(content = '') {
  const c = content.toLowerCase();
  if (/\b(error|err|fatal|crit|critical|emerg|alert)\b/.test(c)) return 'error';
  if (/\b(warn|warning)\b/.test(c)) return 'warn';
  if (/\b(info|notice)\b/.test(c)) return 'info';
  if (/\b(debug|trace|verbose)\b/.test(c)) return 'debug';
  return 'default';
}

const LEVEL_STYLES = {
  error:   { cls: 'text-rose-400',  badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',   icon: <AlertTriangle size={10} />, label: 'ERR' },
  warn:    { cls: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <AlertTriangle size={10} />, label: 'WRN' },
  info:    { cls: 'text-sky-400',   badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',       icon: <Info size={10} />,          label: 'INF' },
  debug:   { cls: 'text-zinc-500',  badge: 'bg-zinc-800 text-zinc-500 border-zinc-700',          icon: <Bug size={10} />,           label: 'DBG' },
  default: { cls: 'text-zinc-300',  badge: 'bg-zinc-900 text-zinc-500 border-zinc-800',          icon: <Terminal size={10} />,      label: 'LOG' },
};

// ─── Convert any log item from backend into {time, content} ──────────────────
function normalizeLogItem(item) {
  // Case 1: Loki raw array [nanosecond_timestamp, "log line"]
  if (Array.isArray(item) && item.length === 2) {
    const ns = parseInt(item[0]);
    const ts = isNaN(ns)
      ? '—'
      : new Date(ns / 1_000_000).toLocaleTimeString([], {
          hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    const line = typeof item[1] === 'string' ? item[1] : JSON.stringify(item[1]);
    return { time: ts, content: line };
  }

  // Case 2: Already {time, content} or {timestamp, message} shape
  if (item && typeof item === 'object') {
    const content =
      item.content   ??
      item.message   ??
      item.line      ??
      item.text      ??
      item.log       ??
      JSON.stringify(item);

    const rawTime =
      item.time      ??
      item.timestamp ??
      item.ts        ??
      '—';

    return {
      time: formatTime(rawTime),
      content: typeof content === 'string' ? content : JSON.stringify(content),
    };
  }

  // Case 3: plain string
  return { time: '—', content: String(item) };
}

// ─── Convert any timestamp value → HH:MM:SS ──────────────────────────────────
function formatTime(raw) {
  if (!raw || raw === '—') return '—';
  const s = String(raw).trim();

  // Already looks like a time string (HH:MM or HH:MM:SS)
  if (/^\d{1,2}:\d{2}/.test(s)) return s;

  const num = Number(s);
  if (isNaN(num)) return s.slice(0, 8); // show max 8 chars of unknown string

  let ms;
  if (num > 1e15) {
    // Nanoseconds (16–19 digits) → ms
    ms = num / 1_000_000;
  } else if (num > 1e12) {
    // Microseconds (13–15 digits) → ms
    ms = num / 1_000;
  } else if (num > 1e9) {
    // Milliseconds (10–13 digits)
    ms = num;
  } else {
    // Unix seconds
    ms = num * 1_000;
  }

  return new Date(ms).toLocaleTimeString([], {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ─── Single log row ───────────────────────────────────────────────────────────
function LogRow({ log, filter }) {
  const level = detectLevel(log.content);
  const style = LEVEL_STYLES[level];

  const renderContent = () => {
    if (!filter) return <span>{log.content}</span>;
    const escaped = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex   = new RegExp(`(${escaped})`, 'gi');
    const parts   = log.content.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-indigo-500/30 text-indigo-200 rounded px-0.5">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className={`flex items-start gap-3 px-3 py-1.5 rounded hover:bg-white/[0.03] transition-colors ${style.cls}`}>
      <span className="text-zinc-700 text-[11px] font-mono shrink-0 mt-0.5 w-[64px] overflow-hidden truncate" title={log.time}>
        {log.time}
      </span>
      <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0 flex items-center gap-1 mt-0.5 ${style.badge}`}>
        {style.icon}
        {style.label}
      </span>
      <span className={`text-[12px] font-mono break-all leading-relaxed flex-1 ${style.cls}`}>
        {renderContent()}
      </span>
    </div>
  );
}

// ─── Main LogsViewer ──────────────────────────────────────────────────────────
export default function LogsViewer() {
  const [isPolling, setIsPolling]     = useState(false);
  const [logQuery, setLogQuery]       = useState('{job=~".+"}');
  const [limit, setLimit]             = useState(100);
  const [logs, setLogs]               = useState([]);
  const [filter, setFilter]           = useState('');
  const [autoScroll, setAutoScroll]   = useState(true);
  const [isLoading, setIsLoading]     = useState(false);
  const [lastFetch, setLastFetch]     = useState(null);
  const [error, setError]             = useState(null);

  const logsEndRef  = useRef(null);
  const intervalRef = useRef(null);

  // ── Fetch logs from GET /api/logs ─────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        query: logQuery,
        limit: String(Math.min(Math.max(1, limit), 500)),
      });
      const res = await fetch(`/api/logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Accept both {status:"ok", logs:[...]} and {status:"ok", lines:[...]}
      const raw = Array.isArray(data.logs)
        ? data.logs
        : Array.isArray(data.lines)
        ? data.lines
        : [];

      setLogs(raw.map(normalizeLogItem));
      setLastFetch(new Date());
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [logQuery, limit]);

  // ── Polling lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isPolling) {
      fetchLogs();
      intervalRef.current = setInterval(fetchLogs, 3_000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPolling, fetchLogs]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredLogs = filter
    ? logs.filter((l) => l.content.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  const errorCount = filteredLogs.filter((l) => detectLevel(l.content) === 'error').length;
  const warnCount  = filteredLogs.filter((l) => detectLevel(l.content) === 'warn').length;

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      <div className="shrink-0 h-[88px] w-full" />

      {/* ── Header (no dropdowns that overflow) ───────────────────────── */}
      <div className="glass-header px-5 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">

          {/* Title */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Activity size={14} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Loki Observability</p>
              <h2 className="text-sm font-semibold text-white leading-tight">Live Server Logs</h2>
            </div>
          </div>

          {/* LogQL query — plain input, no dropdown */}
          <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 focus-within:border-indigo-500/40 transition-colors">
            <Search size={12} className="text-zinc-600 shrink-0" />
            <input
              type="text"
              value={logQuery}
              onChange={(e) => setLogQuery(e.target.value)}
              disabled={isPolling}
              className="bg-transparent border-none text-zinc-200 text-xs font-mono focus:ring-0 flex-1 p-0 min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder='{job="nginx"} |= "error"'
              onKeyDown={(e) => { if (e.key === 'Enter' && !isPolling) fetchLogs(); }}
              title="LogQL query — press Enter to fetch"
            />
          </div>

          {/* Limit */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 shrink-0">
            <Settings2 size={11} className="text-zinc-600" />
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={isPolling}
              className="bg-transparent border-none text-zinc-300 text-xs focus:ring-0 p-0 cursor-pointer disabled:opacity-50"
            >
              {[50, 100, 200, 500].map((n) => (
                <option key={n} value={n} className="bg-zinc-900">{n} lines</option>
              ))}
            </select>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={fetchLogs}
              disabled={isPolling || isLoading}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900/80 border border-zinc-800
                         text-zinc-400 hover:text-white hover:border-zinc-700 transition-all disabled:opacity-40"
              title="Fetch once"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setIsPolling((v) => !v)}
              className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all ${
                isPolling
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
              title={isPolling ? 'Stop' : 'Stream every 3s'}
            >
              {isPolling
                ? <Square size={13} className="fill-current" />
                : <Play size={13}   className="fill-current ml-0.5" />
              }
            </button>

            <button
              onClick={() => { setLogs([]); setError(null); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900/80 border border-zinc-800
                         text-zinc-500 hover:text-white hover:border-zinc-700 transition-all"
              title="Clear view"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Meta bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2 bg-zinc-950/90 border-b border-white/[0.04] text-[11px] text-zinc-600 font-medium shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${isPolling ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
            {isPolling ? 'Streaming · 3s' : 'Paused'}
          </span>
          <span className="shrink-0">{filteredLogs.length} lines</span>
          {filter        && <span className="text-indigo-400 shrink-0">filtered from {logs.length}</span>}
          {errorCount > 0 && <span className="text-rose-400 shrink-0">{errorCount} errors</span>}
          {warnCount  > 0 && <span className="text-amber-400 shrink-0">{warnCount} warnings</span>}
          {lastFetch     && <span className="hidden sm:inline shrink-0">Last: {lastFetch.toLocaleTimeString([], { hour12: false })}</span>}
          {error         && <span className="text-rose-400 truncate" title={error}>⚠ {error}</span>}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Inline text filter */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Search size={10} className="text-zinc-700" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="bg-transparent border-none text-zinc-400 text-[11px] focus:ring-0 p-0 w-28 placeholder-zinc-700"
            />
          </div>

          {/* Auto-scroll */}
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-400 transition-colors select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950 w-3 h-3"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      {/* ── Log content ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-xs bg-[#050508] p-2">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-3">
            <Activity size={28} className="opacity-20" />
            {error ? (
              <p className="text-rose-400 text-xs text-center px-8">{error}</p>
            ) : isPolling ? (
              <p className="animate-pulse text-xs">Waiting for logs…</p>
            ) : (
              <p className="text-xs text-center px-8">
                No logs. Click <kbd className="mx-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">▶</kbd>
                to start streaming, or <kbd className="mx-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">↺</kbd> to fetch once.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredLogs.map((log, i) => (
              <LogRow key={i} log={log} filter={filter} />
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
