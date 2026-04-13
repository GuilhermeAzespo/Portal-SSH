import { useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SocketContext } from '../contexts/SocketContext';
import { AuthContext } from '../contexts/AuthContext';
import { useWorkspaceStore } from '../store/workspaceStore';
import { TerminalBlock } from '../components/TerminalBlock';
import { X, ArrowLeft, Plus, Terminal } from 'lucide-react';

export const Workspace = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useWorkspaceStore();

  const isViewer = user?.role === 'Visualizador';

  useEffect(() => {
    if (!socket) return;

    const startHostId = params.get('startHostId');
    const joinSessionId = params.get('joinSessionId');

    const handleSessionStarted = (payload: any) => {
      addTab({ id: payload.sessionId, title: payload.hostName, type: 'active' });
      navigate('/workspace', { replace: true });
    };

    const handleSessionJoined = (payload: any) => {
      addTab({ id: payload.sessionId, title: payload.hostName + (isViewer ? ' (View)' : ''), type: isViewer ? 'spectator' : 'active' });
      navigate('/workspace', { replace: true });
    };

    const handleError = (err: any) => {
      alert(`SSH Error: ${err}`);
      navigate('/dashboard');
    };

    socket.on('session_started', handleSessionStarted);
    socket.on('session_joined', handleSessionJoined);
    socket.on('ssh_error', handleError);

    if (startHostId) {
      if (isViewer) {
        alert('Você não tem permissão para iniciar sessões SSH.');
        navigate('/dashboard');
        return;
      }
      socket.emit('start_session', { hostId: Number(startHostId) });
    } else if (joinSessionId) {
      socket.emit('join_session', { sessionId: joinSessionId });
    } else if (tabs.length === 0) {
      navigate('/dashboard');
    }

    return () => {
      socket.off('session_started', handleSessionStarted);
      socket.off('session_joined', handleSessionJoined);
      socket.off('ssh_error', handleError);
    };
  }, [socket, params, navigate, isViewer]);

  if (tabs.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-base)', color: 'var(--text-muted)',
        flexDirection: 'column', gap: '0.75rem', fontFamily: 'var(--font-mono)',
      }}>
        <Terminal size={32} style={{ opacity: 0.3 }} />
        <span style={{ fontSize: '0.85rem' }}>Iniciando workspace...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' }} className="fade-in">

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        height: '42px',
        flexShrink: 0,
      }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0 1rem',
            background: 'transparent',
            border: 'none',
            borderRight: '1px solid var(--border-light)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-body)',
            transition: 'color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={14} /> Dashboard
        </button>

        {/* Logo pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '0 0.875rem',
          borderRight: '1px solid var(--border-light)',
          color: 'var(--primary)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}>
          <Terminal size={13} /> workspace
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', flex: 1 }}>
          {tabs.map(tab => {
            const isActive = activeTabId === tab.id;
            const isSpectator = tab.type === 'spectator';
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0 1.25rem',
                  borderRight: '1px solid var(--border-light)',
                  background: isActive ? 'var(--bg-base)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  minWidth: '140px',
                  maxWidth: '220px',
                  position: 'relative',
                  transition: 'background 0.15s',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >
                {/* Status dot */}
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: isSpectator ? 'var(--warning)' : 'var(--success)',
                  boxShadow: isActive ? `0 0 6px ${isSpectator ? 'var(--warning)' : 'var(--success)'}` : 'none',
                }} />
                <span style={{
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  flex: 1, fontSize: '0.8rem',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: isActive ? 500 : 400,
                }}>
                  {tab.title}
                </span>
                <X
                  size={13}
                  style={{ color: 'var(--text-subtle)', flexShrink: 0, transition: 'color 0.15s' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tab.type === 'active') {
                      socket?.emit('close_session', { sessionId: tab.id });
                    }
                    removeTab(tab.id);
                    if (tabs.length === 1) navigate('/dashboard');
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
                />
              </div>
            );
          })}
        </div>

        {/* New tab button moved to Dashboard approach for consistency */}
      </div>

      {/* Terminal panels */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {tabs.map(tab => (
          <TerminalBlock
            key={tab.id}
            sessionId={tab.id}
            isActive={activeTabId === tab.id}
            readOnly={isViewer}
          />
        ))}
      </div>
    </div>
  );
};
