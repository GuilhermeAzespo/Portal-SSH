import { useEffect, useRef, useContext } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SocketContext } from '../contexts/SocketContext';
import 'xterm/css/xterm.css';

interface TerminalBlockProps {
  sessionId: string;
  isActive: boolean;
}

export const TerminalBlock = ({ sessionId, isActive }: TerminalBlockProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Fira Code, monospace',
      theme: {
        background: '#151A23',
        foreground: '#F3F4F6'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    // Fit needs to be called after open and whenever resized
    fitAddon.fit();
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    if (socket) {
      const handleSshData = (payload: any) => {
        // We will update backend to send { sessionId, data }
        if (payload.sessionId === sessionId) {
          term.write(payload.data);
        }
      };

      socket.on('ssh_data', handleSshData);

      term.onData(data => {
        socket.emit('ssh_input', { sessionId, data });
      });

      const handleResize = () => {
        fitAddon.fit();
        socket.emit('resize', { sessionId, cols: term.cols, rows: term.rows });
      };

      window.addEventListener('resize', handleResize);

      return () => {
        socket.off('ssh_data', handleSshData);
        window.removeEventListener('resize', handleResize);
        term.dispose();
      };
    }
  }, [sessionId, socket]);

  // Fit again when active changes
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 100);
    }
  }, [isActive]);

  return (
    <div 
      style={{ 
        height: '100%', 
        width: '100%', 
        display: isActive ? 'block' : 'none',
        background: '#151A23',
        padding: '8px'
      }} 
      ref={terminalRef} 
    />
  );
};
