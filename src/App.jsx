import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ChatArea from './components/ChatArea';
import LogsViewer from './components/LogsViewer';

function App() {
  const [activeTab, setActiveTab] = useState('assistant'); // 'assistant' or 'logs'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <Topbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          toggleSidebar={() => setIsSidebarOpen(true)} 
        />
        
        <div className="flex-1 overflow-hidden relative">
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'assistant' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}>
            <ChatArea />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'logs' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}>
            <LogsViewer />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
