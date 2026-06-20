import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ServerDashboard from './components/ServerDashboard';
import WelcomeScreen from './components/WelcomeScreen';
import AuthPage from './components/AuthPage';

function App() {
  const [activeTab, setActiveTab]       = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [agentStatus, setAgentStatus]   = useState({ status: 'starting', message: 'Checking agent...' });
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [authView, setAuthView]         = useState('welcome');

  // ── Session management ────────────────────────────────────────────────
  const [sessions, setSessions]             = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(() => localStorage.getItem('chatSessionId'));


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

  // ── Fetch chat sessions list ───────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    const token  = localStorage.getItem('token');
    const currentSid = localStorage.getItem('chatSessionId');
    if (!userId || !token) return;
    try {
      const res = await fetch(`/api/sessions/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        let data = await res.json();
        
        // Normalize id to sessionId just in case the backend uses 'id'
        data = data.map(s => ({ ...s, sessionId: s.sessionId || s.id }));

        // If the backend is slow to return the newly created session, keep it in the UI artificially
        if (currentSid && !data.find(s => s.sessionId === currentSid)) {
          setSessions(prev => {
            const existing = prev.find(s => s.sessionId === currentSid);
            return [{ 
              sessionId: currentSid, 
              title: existing?.title || 'New Chat Session' 
            }, ...data];
          });
        } else {
          setSessions(data);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch sessions:', e.message);
    }
  }, []);

  // ── Initialize session & load list on login ───────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    const init = async () => {
      const sid = localStorage.getItem('chatSessionId');
      if (sid) {
        setCurrentSessionId(sid);
      } else {
        setCurrentSessionId(null);
      }
      fetchSessions();
    };
    init();
  }, [isLoggedIn, fetchSessions]);

  // ── Create a brand-new chat session (Frontend only until first message) 
  const handleNewChat = useCallback(() => {
    localStorage.removeItem('chatSessionId');
    setCurrentSessionId(null);
    setActiveTab('chat');
    setIsSidebarOpen(false);
  }, []);

  const handleSessionCreated = useCallback((newId) => {
    setCurrentSessionId(newId);
    fetchSessions();
  }, [fetchSessions]);

  // ── Switch to an existing session ─────────────────────────────────────
  const handleSelectSession = useCallback((sessionId) => {
    localStorage.setItem('chatSessionId', sessionId);
    setCurrentSessionId(sessionId);
    setActiveTab('chat');
    setIsSidebarOpen(false);
  }, []);

  // ── Refresh sessions after AI generates a title (~4s delay) ───────────
  const handleChatDone = useCallback(() => {
    setTimeout(() => fetchSessions(), 4000);
  }, [fetchSessions]);


  return (
    <div className="flex h-screen w-full max-w-full overflow-x-hidden bg-[#0a0a0c] text-foreground relative font-sans">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-zinc-400/[0.05] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-white/[0.04] rounded-full blur-3xl" />
      </div>

      {!isLoggedIn ? (
        authView === 'welcome' ? (
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
                onClick={() => setAuthView('auth')}
                className="px-6 py-2 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
              >
                Enter App
              </button>
            </div>
            <WelcomeScreen onLogin={() => setAuthView('auth')} />
          </div>
        ) : (
          <AuthPage 
            onLogin={() => setIsLoggedIn(true)} 
            onBack={() => setAuthView('welcome')} 
          />
        )
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddServer={() => setShowServerModal(true)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden relative z-10">

        <div className="flex-1 relative w-full h-full">
          {/* Full Screen Chat Tab */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              activeTab === 'chat' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {activeTab === 'chat' && (
              <ChatArea 
                sessionId={currentSessionId} 
                onSessionCreated={handleSessionCreated} 
                onChatDone={handleChatDone} 
              />
            )}
          </div>

          {/* Server Dashboard Tab */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              activeTab === 'dashboard' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {activeTab === 'dashboard' && <ServerDashboard />}
          </div>
        </div>
      </main>
        </>
      )}
    </div>
  );
}

export default App;
