import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Send, Bot, User, Copy, Check, Sparkles, ChevronDown, Play, X, TerminalSquare, Loader2, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ─── Utility: copy to clipboard ─────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg
                 text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
      title="Copy message"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

// ─── Typing indicator dots ───────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5">
      {[0, 150, 300].map((delay, i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: '1s' }}
        />
      ))}
    </div>
  );
}

const ChatArea = forwardRef(({ sessionId: propSessionId, serverId: propServerId, compact, onChatDone, onSessionCreated, onExecuteCommand, onWriteToTerminal, onWriteRawToTerminal, onWritePromptToTerminal, onThinking, onToolProposal, onApproveTool, onRejectTool, chatMode = 'GENERAL' }, ref) => {
  const [input, setInput]           = useState('');
  const [messages, setMessages]     = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [terminalSessionId, setTerminalSessionId] = useState(null);
  const [analyzingMessage, setAnalyzingMessage] = useState('');

  const messagesEndRef   = useRef(null);
  const scrollAreaRef    = useRef(null);
  const textareaRef      = useRef(null);
  const lastQueryRef     = useRef('');
  const skipHistoryLoadRef = useRef(false);

  // Reset terminal session when serverId changes
  useEffect(() => {
    if (compact) {
      setTerminalSessionId(null);
      setMessages([]);
    }
  }, [propServerId, compact]);

  // Resolve session ID: prop > state (if compact) > localStorage fallback
  const sessionId = propSessionId || (compact ? terminalSessionId : localStorage.getItem('chatSessionId'));

  // ── Load history when session changes ─────────────────────────────────
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    if (skipHistoryLoadRef.current) {
      skipHistoryLoadRef.current = false;
      return;
    }

    const loadHistory = async () => {
      const token = localStorage.getItem('token');
      try {
        const historyRes = await fetch(`/api/sessions/${sessionId}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (historyRes.ok) {
          const data = await historyRes.json();
          const mapped = data.map(msg => {
            const rawRole = (msg.role || '').toLowerCase();
            let mappedRole = 'user';
            if (rawRole === 'ai' || rawRole === 'assistant') mappedRole = 'agent';
            else if (rawRole === 'tool_call' || rawRole === 'tool_result') mappedRole = 'system_result';
            
            return {
              role: mappedRole,
              content: msg.content
            };
          });
          setMessages(mapped);
        } else {
          setMessages([]);
          if (historyRes.status === 404 || historyRes.status === 400 || historyRes.status === 500) {
            if (!compact && !propSessionId && sessionId === localStorage.getItem('chatSessionId')) {
              localStorage.removeItem('chatSessionId');
            } else if (compact && !propSessionId && sessionId === terminalSessionId) {
              setTerminalSessionId(null);
            }
          }
        }
      } catch (e) {
        console.warn('History load skipped:', e.message);
        setMessages([]);
      }
    };

    setMessages([]);
    loadHistory();
  }, [sessionId]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (!showScrollBtn) scrollToBottom();
  }, [messages, showScrollBtn, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  };

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }, [input]);

  // ── Core send function ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async (options = {}) => {
    let queryToUse = '';
    let toolResult = null;
    let toolRejected = false;
    let toolName = null;
    let toolArgs = null;

    if (typeof options === 'string') {
      queryToUse = options;
    } else {
      queryToUse = options.queryOverride !== undefined ? options.queryOverride : input;
      toolResult = options.toolResult || null;
      toolRejected = options.toolRejected || false;
      toolName = options.toolName || null;
      toolArgs = options.toolArgs || null;
    }

    const query = queryToUse.trim();
    if (!query && !toolResult && !toolRejected) return;
    if (isGenerating && !toolResult && !toolRejected) return;

    if (!toolResult && !toolRejected) {
      lastQueryRef.current = query; // Save for tool resubmission
    }

    let activeSessionId = sessionId;

    if (!activeSessionId) {
      // Create new session
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');
      try {
        let url = `/api/sessions?userId=${userId}`;
        if (compact && propServerId) {
          url += `&chatType=TERMINAL&serverId=${propServerId}`;
        }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          activeSessionId = await res.text();
          if (!compact) {
            localStorage.setItem('chatSessionId', activeSessionId);
          } else {
            setTerminalSessionId(activeSessionId);
          }

          // Cập nhật tên đoạn chat bằng AI
          try {
            const titleRes = await fetch('/api/generate_title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: query })
            });
            
            let newTitle = "New Chat";
            if (titleRes.ok) {
              const titleData = await titleRes.json();
              newTitle = titleData.title;
            } else {
              const firstLine = query.trim().split('\n')[0];
              newTitle = firstLine.length > 35 ? firstLine.slice(0, 35) + '...' : firstLine;
            }

            await fetch(`/api/sessions/${activeSessionId}/title`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({ title: newTitle })
            });
          } catch (e) {
            console.warn('Failed to set session title:', e);
          }

          if (onSessionCreated) {
            skipHistoryLoadRef.current = true;
            onSessionCreated(activeSessionId);
          }
        } else {
          throw new Error('Failed to create session');
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: 'user',  content: query },
          { role: 'agent', content: '> ⚠️ **Error:** Could not create a new chat session.' },
        ]);
        return;
      }
    }

    setInput('');
    if (!toolResult && !toolRejected) {
      setMessages((prev) => [
        ...prev,
        { role: 'user',  content: query },
        { role: 'agent', content: '' },
      ]);
    } else {
      // If it's a tool response, we just append an empty agent message to catch the new stream
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: '' },
      ]);
    }
    
    setIsGenerating(true);
    setShowScrollBtn(false);
    scrollToBottom('auto');

    if (compact && onWriteToTerminal && !toolResult && !toolRejected) {
      onWriteToTerminal(`\x1b[36mUser>\x1b[0m ${query}`);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: query || lastQueryRef.current, 
          session_id: activeSessionId,
          auth_token: localStorage.getItem('token'),
          chat_type: compact ? "TERMINAL" : "GENERAL",
          tool_result: toolResult,
          tool_rejected: toolRejected,
          tool_name: toolName,
          tool_args: toolArgs ? JSON.stringify(toolArgs) : null
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let   buffer  = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const data = JSON.parse(raw);

            if (data.type === 'tool_proposal') {
               const proposal = {
                 command: data.command || data.tool_name,
                 ...data,
                 handled: false
               };
               setMessages((prev) => {
                 const updated = [...prev];
                 const last = updated[updated.length - 1];
                 updated[updated.length - 1] = {
                   ...last,
                   toolProposal: proposal
                 };
                 return updated;
               });
               if (onToolProposal) onToolProposal(proposal);
            } else if (data.type === 'thinking') {
              setAnalyzingMessage(data.detail || data.step);
              if (onThinking) onThinking(data);
              if (compact && onWriteToTerminal) {
                 onWriteToTerminal(`\x1b[36m[BOT]\x1b[0m \x1b[33m${data.detail || data.step}\x1b[0m`);
              }
            } else if (data.type === 'status') {
              setAnalyzingMessage(data.content);
              if (compact && onWriteToTerminal) {
                 onWriteToTerminal(`\x1b[33m[SYSTEM]\x1b[0m ${data.content}`);
              }
            } else if (data.chunk !== undefined || data.type === 'message_chunk' || data.type === 'message') {
              setAnalyzingMessage(''); // Clear analyzing message when model starts typing
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + (data.content || data.chunk || '') };
                return updated;
              });
            }
            if (data.done) {
              setIsGenerating(false);
              if (compact && onWriteToTerminal) {
                 onWriteToTerminal(`\x1b[90m[Phiên làm việc hoàn tất]\x1b[0m`);
                 if (onWritePromptToTerminal) onWritePromptToTerminal();
              }
              if (onChatDone) onChatDone();
            }
            if (data.error) {
              setMessages((prev) => {
                const updated = [...prev];
                const last    = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + `\n\n> ⚠️ **Error:** ${data.error}`,
                };
                return updated;
              });
              setIsGenerating(false);
              if (compact && onWriteToTerminal) {
                 onWriteToTerminal(`\x1b[31m[LỖI]\x1b[0m ${data.error}`);
                 if (onWritePromptToTerminal) onWritePromptToTerminal();
              }
            }
          } catch (parseErr) {
            console.warn('SSE parse error:', parseErr, raw);
          }
        }
      }
    } catch (err) {
      console.error('Chat request failed:', err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `> ⚠️ **Connection error:** ${err.message}\n\nMake sure the backend is running on \`http://127.0.0.1:8000\`.`,
        };
        return updated;
      });
      setIsGenerating(false);
    }
  }, [input, isGenerating, sessionId, scrollToBottom, onChatDone]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    sendSystemResult: async (cmd, output) => {
      const activeSessionId = sessionId || (!compact ? localStorage.getItem('chatSessionId') : null);
      if (!activeSessionId || isGenerating) return;

      const hiddenPrompt = `Đây là kết quả lệnh mày vừa chạy (${cmd}), phân tích đi:\n\`\`\`\n${output}\n\`\`\``;

      setMessages((prev) => [
        ...prev,
        { role: 'system_result', content: `Đã thực thi lệnh: ${cmd}` },
        { role: 'agent', content: '' },
      ]);
      setIsGenerating(true);
      scrollToBottom('auto');

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: hiddenPrompt, 
            session_id: activeSessionId,
            auth_token: localStorage.getItem('token')
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const data = JSON.parse(raw);
              if (data.chunk !== undefined) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = { ...last, content: last.content + data.chunk };
                  return updated;
                });
              }
              if (data.done) {
                setIsGenerating(false);
                if (onChatDone) onChatDone();
              }
              if (data.error) {
                setIsGenerating(false);
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        setIsGenerating(false);
      }
    },
    approveTool: (proposal) => {
      const msgIdx = messages.findIndex(
        (m) => m.toolProposal && !m.toolProposal.handled && m.toolProposal.command === proposal.command
      );
      if (msgIdx !== -1) {
        handleConfirmTool(msgIdx);
      }
    },
    rejectTool: (proposal) => {
      const msgIdx = messages.findIndex(
        (m) => m.toolProposal && !m.toolProposal.handled && m.toolProposal.command === proposal.command
      );
      if (msgIdx !== -1) {
        handleRejectTool(msgIdx);
      }
    }
  }), [messages, sendMessage]);

  const handleConfirmTool = useCallback(async (msgIdx) => {
    const msg = messages[msgIdx];
    const proposal = msg.toolProposal;
    const command = proposal.command;
    const args = proposal.arguments || {};
    const serverId = args.server_id || args.serverId || args.server_ip || localStorage.getItem('selectedServerId');
    
    setMessages(prev => {
      const updated = [...prev];
      updated[msgIdx] = { ...updated[msgIdx], toolProposal: { ...updated[msgIdx].toolProposal, handled: true, loading: true } };
      return updated;
    });

    try {
      const token = localStorage.getItem('token');
      const sId = propServerId || serverId;
      const res = await fetch(`/api/ssh/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ serverId: sId, command })
      });
      
      const data = await res.json();
      const terminalOutput = data.output || data.error || "Command executed with no output.";
      
      if (onWriteToTerminal) {
        onWriteToTerminal(`$ ${command}\n${terminalOutput}`);
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[msgIdx] = { ...updated[msgIdx], toolProposal: { ...updated[msgIdx].toolProposal, loading: false } };
        return updated;
      });

      sendMessage({
        queryOverride: "",
        toolResult: terminalOutput,
        toolRejected: false,
        toolName: proposal.tool_name || proposal.command,
        toolArgs: { command }
      });

    } catch (e) {
      setMessages(prev => {
        const updated = [...prev];
        updated[msgIdx] = { ...updated[msgIdx], toolProposal: { ...updated[msgIdx].toolProposal, loading: false } };
        return updated;
      });
      sendMessage({
        queryOverride: lastQueryRef.current,
        toolResult: "Lỗi khi gọi API: " + e.message,
        toolRejected: false,
        toolName: proposal.tool_name || proposal.command,
        toolArgs: args
      });
    }
  }, [messages, sendMessage]);

  const handleRejectTool = useCallback((msgIdx) => {
    const msg = messages[msgIdx];
    setMessages(prev => {
      const updated = [...prev];
      updated[msgIdx] = { ...updated[msgIdx], toolProposal: { ...updated[msgIdx].toolProposal, handled: true } };
      return updated;
    });
    sendMessage({
      queryOverride: "",
      toolResult: null,
      toolRejected: true,
      toolName: msg.toolProposal?.tool_name || msg.toolProposal?.command,
      toolArgs: { command: msg.toolProposal?.command }
    });
  }, [messages, sendMessage]);


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 cyber-grid">
      {/* Mode indicator for TERMINAL */}
      {chatMode === 'TERMINAL' && (
        <div className="shrink-0 px-4 pt-4 pb-2 flex items-center gap-2 border-b border-white/5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Terminal Mode</span>
          <span className="text-xs text-zinc-500">— AI will execute commands on your server</span>
        </div>
      )}
      {/* ── Messages list ───────────────────────────────────────────────── */}
      <div
        id="welcome-scroll-container"
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pb-6 relative"
      >
        <div className={`shrink-0 ${compact ? 'h-4' : 'h-[100px]'} w-full`} />
        {messages.length === 0 ? (
          <div className={`flex-1 flex flex-col items-center justify-center h-full ${compact ? 'pt-4 pb-12' : 'pt-12 md:pt-32 pb-32'} animate-fade-in`}>
            <div className={`${compact ? 'w-12 h-12 rounded-2xl mb-4' : 'w-16 h-16 md:w-20 md:h-20 rounded-3xl mb-8'} bg-white flex items-center justify-center shadow-2xl shadow-white/10`}>
              <Bot size={compact ? 24 : 40} className="text-black" />
            </div>
            {chatMode === 'TERMINAL' ? (
              <>
                <h2 className={`${compact ? 'text-xl' : 'text-3xl md:text-4xl'} font-bold text-white mb-2 md:mb-4 tracking-tight text-center`}>
                  AI Terminal Assistant
                </h2>
                <p className="text-zinc-400 text-base text-center max-w-md">
                  Describe what you want to do — I'll generate and execute the commands for you.
                </p>
              </>
            ) : (
              <>
                <h2 className={`${compact ? 'text-xl' : 'text-3xl md:text-4xl'} font-bold text-white mb-2 md:mb-4 tracking-tight text-center`}>
                  How can I help?
                </h2>
                {!compact && (
                  <p className="text-zinc-400 text-lg text-center max-w-md">
                    Ask about server diagnostics, log analysis, or infrastructure health.
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-6 pb-4 animate-fade-in">
            {messages.map((msg, idx) => {
              const isLast   = idx === messages.length - 1;
              const isStream = isGenerating && isLast && msg.role === 'agent';

              return (
                <div
                  key={idx}
                  className={`flex w-full gap-3 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Agent avatar */}
                  {msg.role === 'agent' && (
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-lg shadow-white/10 mt-0.5">
                      <Bot size={14} className="text-black" />
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`group flex flex-col max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.role === 'agent' ? (
                      <>
                        <div className={`agent-bubble ${chatMode === 'TERMINAL' ? 'agent-bubble-terminal' : ''} ${isStream && !msg.content ? '' : ''}`}>
                          {/* Show thinking/analyzing status */}
                          {(isGenerating || analyzingMessage) && !msg.content && !msg.toolProposal && (
                            <div className="flex flex-col gap-2 animate-fade-in">
                              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                                <Cpu size={14} className="animate-pulse" />
                                <span>AI is thinking...</span>
                              </div>
                              {analyzingMessage && (
                                <div className="flex items-center gap-2 text-zinc-400 text-xs italic">
                                  <Loader2 size={12} className="animate-spin" />
                                  <span>{analyzingMessage}</span>
                                </div>
                              )}
                              <TypingDots />
                            </div>
                          )}
                          {msg.content ? (
                            <div className={isStream ? 'cursor-blink' : ''}>
                              <ReactMarkdown
                                components={{
                                  code({node, inline, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeText = String(children).replace(/\n$/, '');
                                    const isCommand = match && ['bash', 'sh'].includes(match[1]);
                                    return !inline && isCommand ? (
                                      <div className="mt-3 mb-3 rounded-xl bg-[#1e1e1e] border border-white/10 overflow-hidden shadow-xl">
                                        <div className="bg-black/40 px-3 py-2 flex justify-between items-center text-xs text-zinc-400 font-mono border-b border-white/5">
                                           <span className="flex items-center gap-2"><TerminalSquare size={14}/> {match[1]} command</span>
                                           <div className="flex gap-2">
                                             <button onClick={() => onExecuteCommand && onExecuteCommand(codeText)} className="flex items-center gap-1.5 text-black font-bold bg-green-400 hover:bg-green-300 px-3 py-1.5 rounded-lg transition-colors">
                                                <Play size={14}/> Thực thi lệnh này
                                             </button>
                                           </div>
                                        </div>
                                        <pre className="p-4 overflow-x-auto text-sm text-zinc-300">
                                          <code className={className} {...props}>
                                            {children}
                                          </code>
                                        </pre>
                                      </div>
                                    ) : !inline ? (
                                      <pre className="p-3 rounded-lg bg-black/50 overflow-x-auto text-sm my-2 border border-white/5">
                                        <code className={className} {...props}>{children}</code>
                                      </pre>
                                    ) : (
                                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-zinc-300" {...props}>
                                        {children}
                                      </code>
                                    );
                                  }
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            !msg.toolProposal && <TypingDots />
                          )}
                        </div>
                        {msg.toolProposal && !msg.toolProposal.handled && (
                          <div className="mt-3 bg-zinc-800/80 border border-zinc-700 rounded-xl p-4 shadow-xl min-w-[300px]">
                            <div className="flex items-center gap-2 text-zinc-300 font-medium mb-2">
                               <TerminalSquare size={16} className="text-yellow-400" />
                               Yêu cầu thực thi lệnh SSH
                            </div>
                            <pre className="p-3 bg-black/60 rounded-lg text-sm font-mono text-zinc-300 mb-4 whitespace-pre-wrap">
                               {msg.toolProposal.command}
                            </pre>
                            <div className="flex gap-3">
                               <button 
                                 onClick={() => handleConfirmTool(idx)}
                                 className="flex-1 bg-white text-black font-semibold py-2 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                               >
                                 <Check size={16} /> Xác nhận
                               </button>
                               <button 
                                 onClick={() => handleRejectTool(idx)}
                                 className="flex-1 bg-zinc-700 text-white font-semibold py-2 rounded-lg hover:bg-zinc-600 transition-colors flex items-center justify-center gap-2"
                               >
                                 <X size={16} /> Hủy
                               </button>
                            </div>
                          </div>
                        )}
                        {msg.content && !isStream && (
                          <div className="flex mt-1.5">
                            <CopyButton text={msg.content} />
                          </div>
                        )}
                      </>
                    ) : msg.role === 'system_result' ? (
                      <>
                        <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-400 font-mono flex items-center gap-2">
                           <TerminalSquare size={14} className="text-zinc-500" />
                           {msg.content}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="user-bubble">
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <div className="flex mt-1.5">
                          <CopyButton text={msg.content} />
                        </div>
                      </>
                    )}
                  </div>

                  {/* User avatar */}
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={14} className="text-zinc-300" />
                    </div>
                  )}
                  {msg.role === 'system_result' && (
                    <div className="w-8 h-8 rounded-xl bg-transparent flex items-center justify-center shrink-0 mt-0.5" />
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll-to-bottom FAB */}
        {showScrollBtn && (
          <button
            onClick={() => { setShowScrollBtn(false); scrollToBottom(); }}
            className="fixed bottom-28 right-6 z-20 w-9 h-9 rounded-full glass border border-white/10
                       flex items-center justify-center text-zinc-400 hover:text-white
                       shadow-lg hover:shadow-xl transition-all animate-fade-in"
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* ── Composer ────────────────────────────────────────────────────── */}
      <div className={`shrink-0 px-4 ${compact ? 'pb-4 pt-4' : 'pb-8 pt-6'} bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/95 to-transparent relative z-20`}>
        <div className="max-w-4xl mx-auto">
          <div
            className={`
              relative bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/10 transition-all duration-500 shadow-2xl shadow-black/50
              ${isGenerating
                ? 'opacity-60 pointer-events-none'
                : 'focus-within:border-white/40 focus-within:bg-white/[0.05] focus-within:shadow-glow-white'}
            `}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              placeholder={chatMode === 'TERMINAL' ? "Describe what you want me to do on the server..." : "Ask a question..."}
              className={`
                w-full bg-transparent border-none text-white placeholder-zinc-400
                ${compact ? 'text-sm px-4 pt-4 pb-1 min-h-[56px] max-h-[120px]' : 'text-base md:text-lg px-6 pt-6 pb-2 min-h-[72px] max-h-[240px]'} 
                resize-none focus:ring-0 outline-none focus:outline-none custom-scrollbar
                leading-relaxed font-light
              `}
              rows={1}
            />

            <div className="flex items-center justify-between px-4 pb-4 pt-2">
              <div className="flex items-center gap-3">
                {isGenerating ? (
                  <span className="flex items-center gap-2 text-xs font-semibold text-zinc-300 animate-pulse px-2">
                    <Sparkles size={14} />
                    {!compact && "Analyzing Infrastructure..."}
                  </span>
                ) : (
                  !compact && (
                    <span className="text-[11px] text-zinc-400 font-medium select-none px-2 tracking-wide uppercase">
                      Enter to send &nbsp;·&nbsp; Shift+Enter for new line
                    </span>
                  )
                )}
              </div>

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isGenerating}
                className={`
                  flex items-center justify-center ${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full
                  bg-white hover:bg-zinc-200 text-black transition-all duration-300 shadow-lg
                  disabled:opacity-20 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 active:scale-95
                `}
                aria-label="Send message"
              >
                <Send size={compact ? 16 : 18} className="ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatArea;
