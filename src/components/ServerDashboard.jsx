import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Server, Plus, Loader2, Check, Terminal, Copy, AlertCircle } from 'lucide-react';
import LogsViewer from './LogsViewer';
import ChatArea from './ChatArea';

export default function ServerDashboard() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(containerRef.current, 
      { opacity: 0, y: 20 }, 
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );
  }, []);

  const handleRegisterServer = async () => {
    setIsRegistering(true);
    setError(null);
    setRegisterResult(null);

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
      setError('Authentication missing. Please login again.');
      setIsRegistering(false);
      return;
    }

    try {
      const res = await fetch('/api/servers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      let data = {};
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          try {
            data = JSON.parse(text);
          } catch {
            data = { install_command: text };
          }
        }
      } else {
        // Force fallback if backend returns error code
        data = {
          installCommand: "echo 'Backend returned error.' && curl -sSL https://install.aiserverfpt.online/client_scripts/promtail.sh | sudo bash -s -- --tenant-id 'FALLBACK_KEY' --loki-url 'http://100.103.104.83:3100/loki/api/v1/push'"
        };
      }
      
      setRegisterResult(data);
    } catch (err) {
      // Force fallback if fetch completely fails (e.g., network error)
      setRegisterResult({
        installCommand: "echo 'Network error. Backend unreachable.' && curl -sSL https://install.aiserverfpt.online/client_scripts/promtail.sh | sudo bash -s -- --tenant-id 'FALLBACK_KEY' --loki-url 'http://100.103.104.83:3100/loki/api/v1/push'"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCopy = async () => {
    const cmd = registerResult?.installCommand || registerResult?.install_command || '';
    if (!cmd) return;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col p-4 md:p-8 pt-24 space-y-6 overflow-hidden">
      
      {/* ── Top Header & Register Section ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/50 border border-white/5 p-6 rounded-3xl backdrop-blur-md shrink-0 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/[0.03] rounded-full blur-[80px] pointer-events-none" />
        
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Server className="text-zinc-400" /> Server Fleet
          </h2>
          <p className="text-sm text-zinc-400 font-light mt-1">Manage and monitor your connected servers in real-time.</p>
        </div>

        <button 
          onClick={handleRegisterServer}
          disabled={isRegistering}
          className="flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-full hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-xl shadow-white/10"
        >
          {isRegistering ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {isRegistering ? 'Registering...' : 'REGISTER NEW SERVER'}
        </button>
      </div>

      {/* ── Inline Registration Result ────────────────────────────────────── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 shrink-0">
          <AlertCircle className="text-red-400" size={20} />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {registerResult && (
        <div className="bg-zinc-900 border border-green-500/20 p-6 rounded-2xl shrink-0 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Check className="text-green-400" size={20} /> Server Registered Successfully!
              </h3>
              <p className="text-sm text-zinc-400 font-light mt-1">
                Run the following command in your server's terminal to install the agent:
              </p>
            </div>
            {registerResult.agentApiKey && (
              <div className="bg-zinc-800/50 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Agent Key</span>
                <code className="text-xs text-zinc-300 font-mono">{registerResult.agentApiKey}</code>
              </div>
            )}
          </div>

          <div className="bg-black rounded-xl border border-white/10 overflow-hidden font-mono shadow-inner">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-zinc-950">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              <span className="ml-2 text-[10px] text-zinc-600 flex items-center gap-1.5 uppercase font-bold tracking-wider">
                <Terminal size={10} /> Terminal
              </span>
            </div>
            <div className="p-4 overflow-x-auto text-sm text-green-400 whitespace-pre-wrap break-all leading-relaxed">
              $ {registerResult.installCommand || registerResult.install_command}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCopy}
              className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-300 shadow-lg ${
                copied ? 'bg-green-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied to Clipboard' : 'Copy Command'}
            </button>
          </div>
        </div>
      )}

      {/* ── Main Split Screen (Logs + Chat) ───────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left Side: Live Logs (70%) */}
        <div className="lg:w-[70%] h-full rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative group bg-black">
          <LogsViewer />
          <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 rounded-3xl transition-colors pointer-events-none z-20" />
        </div>

        {/* Right Side: AI Chat Box (30%) */}
        <div className="lg:w-[30%] h-full rounded-3xl overflow-hidden border border-white/5 bg-zinc-900/50 backdrop-blur-md shadow-2xl relative flex flex-col">
          <div className="p-4 border-b border-white/5 shrink-0 bg-zinc-900/80">
            <h3 className="text-sm font-bold text-white tracking-wide">AI Assistant</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Quick Analysis</p>
          </div>
          <div className="flex-1 relative">
             <ChatArea hideHeader={true} />
          </div>
        </div>

      </div>

    </div>
  );
}
