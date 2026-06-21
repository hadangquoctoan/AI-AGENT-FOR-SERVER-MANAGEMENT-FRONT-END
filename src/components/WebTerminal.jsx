import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

// ANSI escape helper - avoids OXC parser issues with \x1b in template literals
const esc = String.fromCharCode(0x1b);

const WebTerminal = forwardRef(({ serverId, onCommandOutput, onThinking, onToolProposal, onApproveTool, onRejectTool }, ref) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const currentInput = useRef('');
  const isExecuting = useRef(false);

  // Tool proposal state — stored so approve/deny can reference it
  const [pendingProposal, setPendingProposal] = useState(null);

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#300a24',
        foreground: '#ffffff',
        cursor: '#ffffff',
      },
      fontFamily: '"Fira Code", monospace',
      fontSize: 14,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln(esc + '[1;36m╔══════════════════════════════════════════════════╗' + esc + '[0m');
    term.writeln(esc + '[1;36m║      Welcome to AI-Agent Web Terminal            ║' + esc + '[0m');
    term.writeln(esc + '[1;36m╚══════════════════════════════════════════════════╝' + esc + '[0m');
    term.writeln('');
    term.writeln(esc + '[90m  Type a command and press Enter to execute.' + esc + '[0m');
    term.writeln(esc + '[90m  Or describe what you want — AI will generate commands for you.' + esc + '[0m');
    term.writeln('');
    term.write('$ ');

    term.onKey(({ key, domEvent }) => {
      const ev = domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      // Y/N shortcuts for pending tool proposal
      if (pendingProposal) {
        const k = ev.key.toLowerCase();
        if (k === 'y') {
          ev.preventDefault();
          term.write('\r\n' + esc + '[32m[Approved]' + esc + '[0m\r\n');
          setPendingProposal(null);
          if (onApproveTool) onApproveTool({ command: pendingProposal.command, arguments: pendingProposal.arguments });
          return;
        }
        if (k === 'n') {
          ev.preventDefault();
          term.write('\r\n' + esc + '[31m[Denied]' + esc + '[0m\r\n');
          setPendingProposal(null);
          if (onRejectTool) onRejectTool({ command: pendingProposal.command, arguments: pendingProposal.arguments });
          return;
        }
      }

      if (isExecuting.current) return;

      if (ev.keyCode === 13) {
        term.write('\r\n');
        const cmd = currentInput.current.trim();
        if (cmd) {
          executeCommandInner(cmd, true);
        } else {
          term.write('$ ');
        }
        currentInput.current = '';
      } else if (ev.keyCode === 8) {
        if (currentInput.current.length > 0) {
          term.write('\b \b');
          currentInput.current = currentInput.current.slice(0, -1);
        }
      } else if (printable) {
        term.write(key);
        currentInput.current += key;
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  const writeLine = (text, color = '') => {
    if (!xtermRef.current) return;
    const prefix = color ? esc + '[' + color + 'm' : '';
    const suffix = color ? esc + '[0m' : '';
    xtermRef.current.write(text.replace(/\n/g, '\r\n') + '\r\n');
  };

  const writePrompt = () => {
    if (!xtermRef.current) return;
    xtermRef.current.write('$ ');
  };

  const writeThinkingIndicator = (active) => {
    if (!xtermRef.current) return;
    if (active) {
      xtermRef.current.write('\r' + esc + '[2K');
      xtermRef.current.write(esc + '[90m[AI Agent thinking...' + esc + '[0m ');
    } else {
      xtermRef.current.write('\r' + esc + '[2K');
    }
  };

  // Show tool proposal inline with approve/deny
  const showProposalUI = (proposal) => {
    if (!xtermRef.current) return;
    const term = xtermRef.current;

    term.write('\r\n');
    term.write(esc + '[1;33m┌──────────────────────────────────────────────┐' + esc + '[0m\r\n');
    term.write(esc + '[1;33m│' + esc + '[0m  ' + esc + '[1;37mSSH Command Proposal — Awaiting Your Approval' + esc + '[0m\r\n');
    term.write(esc + '[1;33m│' + esc + '[0m ' + esc + '[90m─────────────────────────────────────────────' + esc + '[0m\r\n');

    const cmd = proposal.command || '';
    const maxWidth = 44;
    if (cmd.length > maxWidth) {
      const pattern = '.{1,' + maxWidth + '}';
      const chunks = cmd.match(new RegExp(pattern, 'g')) || [];
      chunks.forEach((chunk) => {
        term.write(esc + '[1;33m│' + esc + '[0m  ' + esc + '[97m' + chunk + esc + '[0m\r\n');
      });
    } else {
      term.write(esc + '[1;33m│' + esc + '[0m  ' + esc + '[97m' + cmd + esc + '[0m\r\n');
    }

    term.write(esc + '[1;33m│' + esc + '[0m ' + esc + '[90m─────────────────────────────────────────────' + esc + '[0m\r\n');
    term.write(esc + '[1;33m│' + esc + '[0m  ' + esc + '[32m[Y/y]' + esc + '[0m ' + esc + '[97mApprove & Execute' + esc + '[0m     ' + esc + '[31m[N/n]' + esc + '[0m ' + esc + '[97mDeny / Reject' + esc + '[0m\r\n');
    term.write(esc + '[1;33m└──────────────────────────────────────────────┘' + esc + '[0m\r\n');
    writePrompt();
  };

  const executeCommandInner = async (cmd, fromUser = false) => {
    const term = xtermRef.current;
    if (!term || !serverId) return;

    isExecuting.current = true;

    if (fromUser) {
      term.write(cmd + '\r\n');
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/ssh/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serverId,
          command: cmd
        })
      });

      if (res.ok) {
        const data = await res.json();
        const output = data.output || '';
        const error = data.error || '';

        if (output) {
          term.write(output.replace(/\n/g, '\r\n'));
        }
        if (error) {
           term.write(esc + '[31m' + error.replace(/\n/g, '\r\n') + esc + '[0m');
        }

        if (!output.endsWith('\n') && !error.endsWith('\n')) {
          term.write('\r\n');
        }

        if (onCommandOutput) {
          onCommandOutput(cmd, output, error);
        }

      } else {
         term.write('\r\n' + esc + '[31mHTTP Error ' + res.status + esc + '[0m\r\n');
      }
    } catch (err) {
      term.write('\r\n' + esc + '[31mNetwork Error: ' + err.message + esc + '[0m\r\n');
    } finally {
      isExecuting.current = false;
      writePrompt();
    }
  };

  // Expose imperative API
  useImperativeHandle(ref, () => ({
    executeCommand: (cmd) => {
      if (xtermRef.current) {
        executeCommandInner(cmd, false);
      }
    },
    writeOutput: (text) => {
      if (xtermRef.current) {
         xtermRef.current.write(text.replace(/\n/g, '\r\n') + '\r\n');
      }
    },
    writeRaw: (text) => {
      if (xtermRef.current) {
         xtermRef.current.write(text.replace(/\n/g, '\r\n'));
      }
    },
    writePrompt: () => {
      writePrompt();
    },
    showProposal: (proposal) => {
      setPendingProposal(proposal);
      showProposalUI(proposal);
    },
    clearProposal: () => {
      setPendingProposal(null);
    },
    writeThinking: (text) => {
      if (!xtermRef.current) return;
      const term = xtermRef.current;
      term.write('\r' + esc + '[2K');
      if (text) {
        term.write(esc + '[90m[AI] ' + text + esc + '[0m');
      }
    },
    handleApprove: () => {
      if (pendingProposal && onApproveTool) {
        onApproveTool(pendingProposal);
        setPendingProposal(null);
      }
    },
    handleReject: () => {
      if (pendingProposal && onRejectTool) {
        onRejectTool(pendingProposal);
        setPendingProposal(null);
      }
    }
  }));

  return (
    <div
      ref={terminalRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', padding: '10px' }}
    />
  );
});

export default WebTerminal;
