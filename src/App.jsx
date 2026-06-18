import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ChatArea from './components/ChatArea';
import LogsViewer from './components/LogsViewer';
import WelcomeScreen from './components/WelcomeScreen';

function App() {
  const [activeTab, setActiveTab]       = useState('assistant');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [agentStatus, setAgentStatus]   = useState({ status: 'starting', message: 'Checking agent...' });
  const [isLoggedIn, setIsLoggedIn]     = useState(false);

  // Ref to expose sendMessage from ChatArea to Sidebar quick-prompts
  const chatSendRef = useRef(null);

  // ── Poll /api/status every 10s ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const res  = await fetch('/api/status');
        const data = await res.json();
        if (!cancelled) setAgentStatus(data);
      } catch {
        if (!cancelled) setAgentStatus({ status: 'error', message: 'Backend unreachable' });
      }
    };

    checkStatus();
    const id = setInterval(checkStatus, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // ── Quick-prompt handler: switch to assistant tab then fire message ─────
  const handleQuickPrompt = useCallback((prompt) => {
    setActiveTab('assistant');
    // Small delay so ChatArea mounts/renders before we call send
    setTimeout(() => {
      if (chatSendRef.current) chatSendRef.current(prompt);
    }, 80);
  }, []);

  return (
    <div className="flex h-screen w-full max-w-full overflow-x-hidden bg-[#0a0a0c] text-foreground relative font-sans">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-zinc-400/[0.05] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-white/[0.04] rounded-full blur-3xl" />
      </div>

      {!isLoggedIn ? (
        <div className="relative z-10 w-full h-full overflow-y-auto custom-scrollbar">
          {/* Simple header for landing page */}
          <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-6 md:px-12 pt-6 pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-lg shadow-white/10">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <span className="font-bold text-lg text-white tracking-wide">OpsPilot</span>
            </div>
            <button 
              onClick={() => setIsLoggedIn(true)}
              className="px-6 py-2 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
            >
              Enter App
            </button>
          </div>
          <WelcomeScreen onLogin={() => setIsLoggedIn(true)} />
        </div>
      ) : (
        <>
          {/* Mobile sidebar backdrop */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        agentStatus={agentStatus}
        onQuickPrompt={handleQuickPrompt}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden relative z-10">
        <div className="fixed top-0 md:left-72 left-0 right-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
          <div className="pointer-events-auto">
            <Topbar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              toggleSidebar={() => setIsSidebarOpen(true)}
              agentStatus={agentStatus}
            />
          </div>
        </div>

        <div className="flex-1 relative w-full h-full">
          {/* Assistant / Chat panel */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              activeTab === 'assistant' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <ChatArea sendRef={chatSendRef} />
          </div>

          {/* Live Logs panel */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              activeTab === 'logs' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <LogsViewer />
          </div>
        </div>
      </main>
        </>
      )}
    </div>
  );
}

export default App;
