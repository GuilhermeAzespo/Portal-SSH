import { useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SocketContext } from '../contexts/SocketContext';
import { useWorkspaceStore } from '../store/workspaceStore';
import { TerminalBlock } from '../components/TerminalBlock';
import { X, ArrowLeft, Plus } from 'lucide-react';

export const Workspace = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { socket } = useContext(SocketContext);
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useWorkspaceStore();

  useEffect(() => {
    if (!socket) return;

    const startHostId = params.get('startHostId');
    const joinSessionId = params.get('joinSessionId');
    
    const handleSessionStarted = (payload: any) => {
      addTab({ id: payload.sessionId, title: payload.hostName, type: 'active' });
      navigate('/workspace', { replace: true });
    };

    const handleSessionJoined = (payload: any) => {
      addTab({ id: payload.sessionId, title: payload.hostName + ' (View)', type: 'spectator' });
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
  }, [socket, params, navigate]);

  if (tabs.length === 0) {
    return <div style={{ color: 'white', padding: '2rem' }}>Carregando workspace...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' }} className="fade-in">
      <div style={{ display: 'flex', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}>
        <button 
          className="button-outline" 
          style={{ border: 'none', padding: '0 1rem', borderRight: '1px solid var(--border-light)', borderRadius: 0, cursor: 'pointer', background: 'transparent' }}
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={16} /> Dashboard
        </button>
        
        <div style={{ display: 'flex', overflowX: 'auto', flex: 1 }}>
          {tabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.5rem',
                borderRight: '1px solid var(--border-light)',
                background: activeTabId === tab.id ? 'var(--primary)' : 'transparent',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '150px'
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, fontSize: '0.875rem' }}>
                {tab.title}
              </span>
              <X 
                size={14} 
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.id);
                  if (tabs.length === 1) navigate('/dashboard');
                }}
              />
            </div>
          ))}
        </div>
        
        <button 
          className="button-outline" 
          style={{ border: 'none', padding: '0 1rem', borderLeft: '1px solid var(--border-light)', borderRadius: 0, cursor: 'pointer', background: 'transparent' }}
          onClick={() => navigate('/dashboard')}
        >
          <Plus size={16} /> Nova
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {tabs.map(tab => (
          <TerminalBlock 
            key={tab.id} 
            sessionId={tab.id} 
            isActive={activeTabId === tab.id} 
          />
        ))}
      </div>
    </div>
  );
};
