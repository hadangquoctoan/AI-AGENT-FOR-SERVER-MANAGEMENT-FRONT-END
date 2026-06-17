import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatArea() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.messages) {
          setMessages(data.messages);
        }
      })
      .catch((err) => console.error("Failed to load history:", err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isGenerating) return;

    setInput('');
    const userMessage = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMessage]);
    
    // Add empty agent message to update stream
    setMessages((prev) => [...prev, { role: 'agent', content: '' }]);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkString = decoder.decode(value, { stream: true });
          const lines = chunkString.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;
              
              try {
                const data = JSON.parse(dataStr);
                if (data.chunk) {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIdx = newMessages.length - 1;
                    newMessages[lastIdx] = {
                      ...newMessages[lastIdx],
                      content: newMessages[lastIdx].content + data.chunk
                    };
                    return newMessages;
                  });
                }
                if (data.done) {
                  setIsGenerating(false);
                }
                if (data.error) {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content += `\n\n**Error:** ${data.error}`;
                    return newMessages;
                  });
                  setIsGenerating(false);
                }
              } catch (e) {
                console.error("Error parsing JSON:", e, dataStr);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-background to-background">
      
      {/* Messages / Welcome Screen */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="max-w-4xl mx-auto h-full flex flex-col justify-center animate-fade-in">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 shadow-2xl mb-6 relative group cursor-pointer">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl group-hover:bg-indigo-500/30 transition-colors rounded-2xl"></div>
                <Terminal size={32} className="text-indigo-400 relative z-10" />
              </div>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 mb-4 tracking-tight">
                What is happening on your server?
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
                Describe an alert, paste a safe log excerpt, or ask for a troubleshooting procedure. The agent searches your internal runbooks before responding.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
              {[
                { num: '01', title: 'Diagnose an incident', desc: 'Build an evidence-first checklist', prompt: "Analyze this incident: my Linux server is running out of memory." },
                { num: '02', title: 'Run a health check', desc: 'Review CPU, memory, disk and services', prompt: "Give me a safe health-check checklist for a production Linux server." },
                { num: '03', title: 'Inspect service failures', desc: 'Use systemd and journal evidence', prompt: "Explain how to inspect recent systemd service failures." },
              ].map((card, i) => (
                <button 
                  key={i} 
                  onClick={() => setInput(card.prompt)}
                  className="glass-card p-5 text-left group transition-transform hover:scale-[1.02]"
                >
                  <span className="text-xs font-mono text-indigo-400/80 mb-3 block">{card.num}</span>
                  <strong className="block text-sm text-zinc-200 font-medium mb-1 group-hover:text-white transition-colors">{card.title}</strong>
                  <small className="text-xs text-zinc-500">{card.desc}</small>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-6 pb-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-4 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 text-zinc-300' 
                      : 'bg-indigo-600 shadow-lg shadow-indigo-500/20 text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-zinc-800 text-zinc-100 rounded-tr-none'
                      : 'glass-card border-white/5 rounded-tl-none prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>

                </div>
              </div>
            ))}
            
            {isGenerating && (
              <div className="flex justify-start">
                <div className="flex gap-4 max-w-[85%]">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 shadow-lg flex items-center justify-center text-white shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="glass-card border-white/5 rounded-tl-none p-4 flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer Area */}
      <div className="p-4 bg-gradient-to-t from-background via-background/90 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className={`relative glass rounded-2xl p-2 transition-all shadow-2xl ${
            isGenerating ? 'opacity-50 pointer-events-none' : 'focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10'
          }`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              placeholder="Describe the incident or paste a safe log excerpt..."
              className="w-full bg-transparent border-none text-zinc-200 placeholder-zinc-500 text-sm px-4 py-3 resize-none focus:ring-0 custom-scrollbar"
              rows={1}
            />
            <div className="flex justify-between items-center px-3 pb-2 pt-1">
              <span className="text-[11px] text-zinc-500 font-medium">Enter to send | Shift + Enter for new line</span>
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span className="text-xs font-medium pl-1 hidden sm:inline">Send</span>
                <Send size={14} />
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-zinc-500 mt-4 font-medium uppercase tracking-widest">
            Review commands before running them on production systems.
          </p>
        </div>
      </div>
    </div>
  );
}
