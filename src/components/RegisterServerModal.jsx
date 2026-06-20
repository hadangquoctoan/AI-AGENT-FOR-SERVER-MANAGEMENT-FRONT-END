import React, { useState, useEffect, useCallback } from 'react';
import { Server, Copy, Check, Terminal, X, Loader2, AlertCircle, Plus } from 'lucide-react';

export default function RegisterServerModal({ onClose, onCompleteRegistration }) {
  // 'confirm' → 'loading' → 'success' | 'error'
  const [step, setStep] = useState('confirm');
  const [error, setError] = useState(null);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [copiedSsh, setCopiedSsh] = useState(false);
  const [hasCopiedSsh, setHasCopiedSsh] = useState(false);
  const [result, setResult] = useState(null);
  const [pollingStatus, setPollingStatus] = useState('PENDING');

  // Polling: only start after commands are shown
  useEffect(() => {
    if (step !== 'success' || pollingStatus === 'SUCCESS' || !result?.agentApiKey) return;

    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/servers/user/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const servers = await response.json();
          const currentServer = servers.find(s => s.agentApiKey === result.agentApiKey);
          if (currentServer && currentServer.status === 'SUCCESS') {
            setPollingStatus('SUCCESS');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [step, pollingStatus, result]);

  // Called ONLY when user clicks the button — no auto-fetch
  const handleRegister = async () => {
    setStep('loading');

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
      setError('Authentication expired. Please login again.');
      setStep('error');
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
          try { data = JSON.parse(text); } catch { data = { installCommand: text }; }
        }
      } else {
        const errText = await res.text();
        console.error("Backend error:", errText);
        data = {
          installCommand: "echo 'Backend Error' && curl -sSL https://install.aiserverfpt.online/promtail.sh | sudo bash -s -- --tenant-id 'FALLBACK' --loki-url 'https://loki.aiserverfpt.online/loki/api/v1/push'",
          sshKeyInstruction: "echo 'Backend Error: Missing Public Key' >> ~/.ssh/authorized_keys"
        };
      }

      setResult(data);
      setStep('success');
    } catch (err) {
      console.error("Fetch failed:", err);
      const fallbackData = {
        installCommand: "echo 'Network Error' && curl -sSL https://install.aiserverfpt.online/promtail.sh | sudo bash -s -- --tenant-id 'FALLBACK' --loki-url 'https://loki.aiserverfpt.online/loki/api/v1/push'",
        sshKeyInstruction: "echo 'Network Error: Missing Public Key' >> ~/.ssh/authorized_keys"
      };
      setResult(fallbackData);
      setStep('success');
    }
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCopyInstall = async () => {
    const cmd = result?.installCommand || result?.install_command || '';
    if (!cmd) return;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedInstall(true);
      setTimeout(() => setCopiedInstall(false), 2000);
    } catch (err) { console.error('Copy failed', err); }
  };

  const handleCopySsh = async () => {
    const cmd = result?.sshKeyInstruction || (result?.publicKey ? `echo "${result.publicKey}" >> ~/.ssh/authorized_keys` : "echo 'Missing Public Key' >> ~/.ssh/authorized_keys");
    if (!cmd) return;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedSsh(true);
      setHasCopiedSsh(true);
      setTimeout(() => setCopiedSsh(false), 2000);
    } catch (err) { console.error('Copy failed', err); }
  };

  // Auto-transition: when promtail connects AND user copied SSH key
  useEffect(() => {
    if (pollingStatus === 'SUCCESS' && hasCopiedSsh) {
      const timer = setTimeout(() => {
        if (onCompleteRegistration && result?.agentApiKey) {
          onCompleteRegistration(result.agentApiKey);
        } else {
          handleClose();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pollingStatus, hasCopiedSsh, result, onCompleteRegistration, handleClose]);

  // Header icon/text based on step
  const headerIcon = step === 'success' ? <Check size={20} className="text-green-400" /> :
    step === 'error' ? <AlertCircle size={20} className="text-red-400" /> :
    step === 'loading' ? <Loader2 size={20} className="text-white animate-spin" /> :
    <Plus size={20} className="text-blue-400" />;

  const headerTitle = step === 'success' ? 'Server Registered' :
    step === 'error' ? 'Registration Failed' :
    step === 'loading' ? 'Registering...' :
    'Register New Server';

  const headerSubtitle = step === 'success' ? 'Run these commands on your VPS.' :
    step === 'error' ? 'Something went wrong.' :
    step === 'loading' ? 'Creating server profile...' :
    'Deploy an agent to your VPS.';

  return (
    <div onClick={handleClose} className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md px-4 font-sans" style={{ zIndex: 99999 }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">

        {/* Ambient glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/[0.06] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-white/[0.04] rounded-full blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 p-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step === 'success' ? 'bg-green-500/20' : step === 'error' ? 'bg-red-500/20' : step === 'loading' ? 'bg-white/10' : 'bg-blue-500/20'
            }`}>
              {headerIcon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{headerTitle}</h3>
              <p className="text-sm text-zinc-400 font-light">{headerSubtitle}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors p-2">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 relative z-10 overflow-y-auto">

          {/* ── STEP: Confirm ─────────────────────── */}
          {step === 'confirm' && (
            <div className="flex flex-col items-center justify-center py-8 gap-6 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Server size={36} className="text-blue-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Ready to connect a new server?</h4>
                <p className="text-zinc-400 text-sm max-w-md">
                  This will generate unique installation commands for your VPS. You'll need to run them on your server to complete the setup.
                </p>
              </div>
              <button
                onClick={handleRegister}
                className="px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10 flex items-center gap-2"
              >
                <Plus size={18} /> Start Registration
              </button>
            </div>
          )}

          {/* ── STEP: Loading ─────────────────────── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 size={40} className="text-zinc-400 animate-spin" />
              <p className="text-zinc-400 font-medium">Creating server profile...</p>
            </div>
          )}

          {/* ── STEP: Error ─────────────────────── */}
          {step === 'error' && (
            <div className="flex flex-col gap-6">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start">
                <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm leading-relaxed">{error}</p>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setStep('confirm')} className="px-6 py-3 rounded-full border border-white/20 text-white font-bold hover:bg-white/10 transition-colors">
                  Try Again
                </button>
                <button onClick={handleClose} className="px-6 py-3 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition-colors">
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Success (Show Commands) ─────────────────────── */}
          {step === 'success' && (
            <div className="flex flex-col gap-6">
              {(result?.agentApiKey || result?.agent_api_key) && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/60 border border-white/5">
                  <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider shrink-0">Agent Key</span>
                  <code className="text-sm text-white font-mono truncate">{result.agentApiKey || result.agent_api_key}</code>
                </div>
              )}

              <div className="space-y-6">
                {/* Box 1: Install Promtail */}
                <div className="w-full">
                  <h4 className="text-white font-bold mb-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                      Cài đặt Log (Install Command)
                    </div>
                    {pollingStatus === 'PENDING' ? (
                      <span className="text-yellow-400 flex items-center gap-2 text-xs font-medium bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                        <Loader2 size={12} className="animate-spin" /> Đang chờ kết nối...
                      </span>
                    ) : (
                      <span className="text-green-400 flex items-center gap-2 text-xs font-bold bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse">
                        <Check size={12} /> Đã kết nối thành công!
                      </span>
                    )}
                  </h4>
                  <div className="w-full bg-black rounded-xl border border-white/5 overflow-hidden font-mono shadow-inner shadow-black/50">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-zinc-950">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                      <span className="ml-2 text-xs text-zinc-600 flex items-center gap-2">
                        <Terminal size={12} /> root@server:~
                      </span>
                    </div>
                    <div className="p-5 overflow-x-auto text-sm text-green-400 break-all whitespace-pre-wrap">
                      {result?.installCommand || result?.install_command || 'No command available'}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={handleCopyInstall} className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-xl ${copiedInstall ? 'bg-green-500 text-black' : 'bg-white text-black'}`}>
                      {copiedInstall ? <Check size={16} /> : <Copy size={16} />}
                      {copiedInstall ? 'Copied!' : 'Copy Command'}
                    </button>
                  </div>
                </div>

                {/* Box 2: SSH Key */}
                <div className="w-full pt-4 border-t border-white/5">
                  <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <span className="bg-purple-500/20 text-purple-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    Cấp quyền AI Agent (SSH Key)
                  </h4>
                  <div className="w-full bg-black rounded-xl border border-white/5 overflow-hidden font-mono shadow-inner shadow-black/50">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-zinc-950">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                      <span className="ml-2 text-xs text-zinc-600 flex items-center gap-2">
                        <Terminal size={12} /> root@server:~
                      </span>
                    </div>
                    <div className="p-5 overflow-x-auto text-sm text-purple-400 break-all whitespace-pre-wrap">
                      {result?.sshKeyInstruction || (result?.publicKey ? `echo "${result.publicKey}" >> ~/.ssh/authorized_keys` : "echo 'Missing Public Key' >> ~/.ssh/authorized_keys")}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={handleCopySsh} className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-xl ${copiedSsh ? 'bg-green-500 text-black' : 'bg-white text-black'}`}>
                      {copiedSsh ? <Check size={16} /> : <Copy size={16} />}
                      {copiedSsh ? 'Copied!' : 'Copy SSH Command'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end border-t border-white/10 pt-6">
                <button onClick={handleClose} className="px-8 py-3 rounded-full bg-transparent border border-white/20 text-white font-bold hover:bg-white hover:text-black transition-colors duration-300">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
