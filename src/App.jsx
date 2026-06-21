import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ServerDashboard from './components/ServerDashboard';
import WelcomeScreen from './components/WelcomeScreen';
import AuthPage from './components/AuthPage';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [agentStatus, setAgentStatus]     = useState({ status: 'starting', message: 'Checking agent...' });
  const [isLoggedIn, setIsLoggedIn]       = useState(false);
  const [authView, setAuthView]           = useState('welcome');

  const [chatMode, setChatMode] = useState('GENERAL');

  const [allSessions, setAllSessions] = useState([]);

  const generalSessions = allSessions.filter(
    (s) => !s.chatType || s.chatType === 'GENERAL'
  );

  const terminalSessions = allSessions.filter(
    (s) => s.chatType === 'TERMINAL'
  );

  const [servers, setServers] = useState([]);

  const fetchServers = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    const token  = localStorage.getItem('token');
    if (!userId || !token) return;
    try {
      const res = await fetch(`/api/servers/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setServers(data);
      }
    } catch (e) {
      console.warn('Failed to fetch servers:', e.message);
    }
  }, []);

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

  const fetchSessions = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    const token  = localStorage.getItem('token');
    if (!userId || !token) return;
    try {
      const res = await fetch(`/api/sessions/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        let data = await res.json();
        data = data.map((s) => ({ ...s, sessionId: s.sessionId || s.id }));
        setAllSessions(data);
      }
    } catch (e) {
      console.warn('Failed to fetch sessions:', e.message);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const sid = localStorage.getItem('chatSessionId');
    if (sid) setGlobalSessionId(sid);
    else setGlobalSessionId(null);
    fetchSessions();
    fetchServers();
  }, [isLoggedIn, fetchSessions, fetchServers]);

  const handleChatModeChange = useCallback((newMode) => {
    setChatMode(newMode);
    if (newMode === 'TERMINAL') {
      fetchServers();
    }
  }, [fetchServers]);

  const [globalSessionId, setGlobalSessionId] = useState(
    () => localStorage.getItem('chatSessionId')
  );

  const handleNewChat = useCallback(() => {
    localStorage.removeItem('chatSessionId');
    setGlobalSessionId(null);
    setChatMode('GENERAL');
  }, []);

  const handleGlobalSessionCreated = useCallback((newId) => {
    localStorage.setItem('chatSessionId', newId);
    setGlobalSessionId(newId);
    fetchSessions();
  }, [fetchSessions]);

  const handleSelectSession = useCallback((sessionId) => {
    localStorage.setItem('chatSessionId', sessionId);
    setGlobalSessionId(sessionId);
    setChatMode('GENERAL');
    setIsSidebarOpen(false);
  }, []);

  const [dashboardTarget, setDashboardTarget] = useState({
    serverId: null,
    sessionId: null,
  });

  const handleDashboardSessionUpdate = useCallback(({ serverId, sessionId }) => {
    setDashboardTarget({ serverId, sessionId });
  }, []);

  const handleSelectTerminalSession = useCallback((session) => {
    const token = localStorage.getItem('token');
    fetch(`/api/sessions/${session.sessionId}/context`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((context) => {
        if (context?.serverId) {
          setDashboardTarget({ serverId: context.serverId, sessionId: session.sessionId });
          setChatMode('TERMINAL');
          setIsSidebarOpen(false);
        }
      })
      .catch(() => {});
  }, [setIsSidebarOpen]);

  const handleChatDone = useCallback(() => {
    setTimeout(() => fetchSessions(), 4000);
  }, [fetchSessions]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('chatSessionId');
    setIsLoggedIn(false);
    setAuthView('welcome');
    setAllSessions([]);
    setGlobalSessionId(null);
    setDashboardTarget({ serverId: null, sessionId: null });
    setServers([]);
  }, []);

  const handleDeleteSession = useCallback(async (e, sessionIdToDelete) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/sessions/${sessionIdToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (globalSessionId === sessionIdToDelete) {
        handleNewChat();
      }
      fetchSessions();
    } catch (err) {
      console.warn('Failed to delete session', err);
    }
  }, [globalSessionId, handleNewChat, fetchSessions]);

  const activeView = chatMode === 'TERMINAL' ? 'dashboard' : 'chat';

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

          {/* Sidebar */}
          <Sidebar
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            agentStatus={agentStatus}
            activeTab={activeView}
            setActiveTab={() => {}}
            chatMode={chatMode}
            setChatMode={handleChatModeChange}
            sessions={generalSessions}
            currentSessionId={globalSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onLogout={handleLogout}
            onDeleteSession={handleDeleteSession}
            terminalServers={servers.filter((s) => s.status === 'SUCCESS')}
            terminalSessions={terminalSessions}
            onSelectTerminalSession={handleSelectTerminalSession}
          />

          {/* Main content — always renders ServerDashboard directly, no wrappers */}
          <ServerDashboard
            onSessionUpdate={handleDashboardSessionUpdate}
            onServerListUpdate={fetchServers}
            initialServerId={dashboardTarget.serverId}
            initialSessionId={dashboardTarget.sessionId}
            chatMode={chatMode}
            globalSessionId={globalSessionId}
            onGlobalSessionCreated={handleGlobalSessionCreated}
            onChatDone={handleChatDone}
            onSelectSession={handleSelectSession}
          />
        </>
      )}
    </div>
  );
}

export default App;
