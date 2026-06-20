import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

const WebTerminal = forwardRef(({ serverId, onCommandOutput }, ref) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const currentInput = useRef('');
  const isExecuting = useRef(false);

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#300a24', // Ubuntu terminal background
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

    term.writeln('Welcome to AI-Agent Web Terminal');
    term.write('\r\n$ ');

    term.onKey(({ key, domEvent }) => {
      if (isExecuting.current) return; // Block input while running command

      const ev = domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      if (ev.keyCode === 13) {
        // Enter key
        term.write('\r\n');
        const cmd = currentInput.current.trim();
        if (cmd) {
          executeCommandInner(cmd, true); // true = from user input
        } else {
          term.write('$ ');
        }
        currentInput.current = '';
      } else if (ev.keyCode === 8) {
        // Backspace
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

  const executeCommandInner = async (cmd, fromUser = false) => {
    const term = xtermRef.current;
    if (!term || !serverId) return;

    isExecuting.current = true;
    
    // If command comes from AI agent (not typed by user), we simulate typing or just print it
    if (!fromUser) {
      term.write(cmd + '\r\n');
    }

    try {
      const token = localStorage.getItem('token');
      // For fetch, we should use full URL if proxy isn't set, but standard is /api/...
      const res = await fetch(`http://localhost:8080/api/ssh/execute`, {
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
        
        // Write output to terminal
        if (output) {
          // Replace newlines with \r\n for xterm
          term.write(output.replace(/\n/g, '\r\n'));
        }
        if (error) {
           term.write('\x1b[31m' + error.replace(/\n/g, '\r\n') + '\x1b[0m');
        }
        
        // Ensure ends with newline
        if (!output.endsWith('\n') && !error.endsWith('\n')) {
          term.write('\r\n');
        }

        // Return output via callback for AI
        if (onCommandOutput) {
          onCommandOutput(cmd, output, error);
        }

      } else {
         term.write(`\r\n\x1b[31mHTTP Error ${res.status}\x1b[0m\r\n`);
      }
    } catch (err) {
      term.write(`\r\n\x1b[31mNetwork Error: ${err.message}\x1b[0m\r\n`);
    } finally {
      isExecuting.current = false;
      term.write('$ ');
    }
  };

  useImperativeHandle(ref, () => ({
    executeCommand: (cmd) => {
      if (xtermRef.current) {
        executeCommandInner(cmd, false);
      }
    },
    writeOutput: (text) => {
      if (xtermRef.current) {
         xtermRef.current.write(text.replace(/\n/g, '\r\n') + '\r\n');
         xtermRef.current.write('$ ');
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
