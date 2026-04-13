import { useEffect, useRef, useContext } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SocketContext } from '../contexts/SocketContext';
import 'xterm/css/xterm.css';

interface TerminalBlockProps {
  sessionId: string;
  isActive: boolean;
  readOnly?: boolean;
}

export const TerminalBlock = ({ sessionId, isActive, readOnly = false }: TerminalBlockProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: !readOnly,
      fontFamily: 'Fira Code, monospace',
      theme: {
        background: '#151A23',
        foreground: '#F3F4F6',
        cursor: readOnly ? 'rgba(0,0,0,0)' : '#00D4AA'
      },
      disableStdin: readOnly
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
        if (payload.sessionId === sessionId) {
          term.write(payload.data);
        }
      };

      socket.on('ssh_data', handleSshData);

      if (!readOnly) {
        term.onData(data => {
          socket.emit('ssh_input', { sessionId, data });
        });
      }

      const handleResize = () => {
        fitAddon.fit();
        if (!readOnly) {
          socket.emit('resize', { sessionId, cols: term.cols, rows: term.rows });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        socket.off('ssh_data', handleSshData);
        window.removeEventListener('resize', handleResize);
        term.dispose();
      };
    }
  }, [sessionId, socket, readOnly]);

  // Fit again when active changes
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 100);
    }
  }, [isActive]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', display: isActive ? 'block' : 'none' }}>
      {readOnly && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '24px',
          zIndex: 10,
          background: 'rgba(234, 179, 8, 0.1)',
          color: '#EAB308',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          fontWeight: 600,
          border: '1px solid rgba(234, 179, 8, 0.2)',
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)',
          fontFamily: 'var(--font-mono)'
        }}>
          Apenas Leitura
        </div>
      )}
      <div 
        style={{ 
          height: '100%', 
          width: '100%', 
          background: '#151A23',
          padding: '8px'
        }} 
        ref={terminalRef} 
      />
    </div>
  );
};
