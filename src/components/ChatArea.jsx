import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { Send, Bot, User, Copy, Check, Sparkles, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import WelcomeScreen from './WelcomeScreen';

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

// ─── ChatArea (main component) ───────────────────────────────────────────────
function ChatArea({ sendRef }) {
  const [input, setInput]           = useState('');
  const [messages, setMessages]     = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef   = useRef(null);
  const scrollAreaRef    = useRef(null);
  const textareaRef      = useRef(null);

  // ── Load history on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/history')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (d?.messages) setMessages(d.messages); })
      .catch((e) => console.warn('History load skipped:', e.message));
  }, []);

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

  // ── Core send function (also exposed via ref for sidebar quick-prompts) ────
  const sendMessage = useCallback(async (queryOverride) => {
    const query = (queryOverride ?? input).trim();
    if (!query || isGenerating) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user',  content: query },
      { role: 'agent', content: '' },
    ]);
    setIsGenerating(true);
    setShowScrollBtn(false);
    scrollToBottom('auto');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
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
  }, [input, isGenerating, scrollToBottom]);

  // Expose sendMessage to App via ref (for sidebar quick-prompts)
  useImperativeHandle(sendRef, () => sendMessage, [sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full cyber-grid">
      {/* ── Messages list ───────────────────────────────────────────────── */}
      <div
        id="welcome-scroll-container"
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 relative"
      >
        <div className="shrink-0 h-[100px] w-full" />
        {messages.length === 0 ? (
          <WelcomeScreen onSelect={(p) => sendMessage(p)} scrollContainer={scrollAreaRef} />
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
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 mt-0.5">
                      <Bot size={14} className="text-white" />
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`group flex flex-col max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.role === 'agent' ? (
                      <>
                        <div className={`agent-bubble ${isStream && !msg.content ? '' : ''}`}>
                          {msg.content ? (
                            <div className={isStream ? 'cursor-blink' : ''}>
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <TypingDots />
                          )}
                        </div>
                        {msg.content && !isStream && (
                          <div className="flex mt-1.5">
                            <CopyButton text={msg.content} />
                          </div>
                        )}
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
      <div className="shrink-0 px-4 pb-8 pt-6 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/95 to-transparent relative z-20">
        <div className="max-w-4xl mx-auto">
          <div
            className={`
              relative bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/10 transition-all duration-500 shadow-2xl shadow-black/50
              ${isGenerating
                ? 'opacity-60 pointer-events-none'
                : 'focus-within:border-indigo-500/40 focus-within:bg-white/[0.05] focus-within:shadow-glow-indigo'}
            `}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              placeholder="Ask a question or paste a log excerpt..."
              className="
                w-full bg-transparent border-none text-white placeholder-zinc-500
                text-base md:text-lg px-6 pt-6 pb-2 resize-none focus:ring-0 outline-none focus:outline-none custom-scrollbar
                min-h-[72px] max-h-[240px] leading-relaxed font-light
              "
              rows={1}
            />

            <div className="flex items-center justify-between px-4 pb-4 pt-2">
              <div className="flex items-center gap-3">
                {isGenerating ? (
                  <span className="flex items-center gap-2 text-xs font-semibold text-indigo-400 animate-pulse px-2">
                    <Sparkles size={14} />
                    Analyzing Infrastructure...
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-600 font-medium select-none px-2 tracking-wide uppercase">
                    Enter to send &nbsp;·&nbsp; Shift+Enter for new line
                  </span>
                )}
              </div>

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isGenerating}
                className="
                  flex items-center justify-center w-12 h-12 rounded-full
                  bg-white hover:bg-zinc-200 text-black transition-all duration-300 shadow-lg
                  disabled:opacity-20 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 active:scale-95
                "
                aria-label="Send message"
              >
                <Send size={18} className="ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatArea;
