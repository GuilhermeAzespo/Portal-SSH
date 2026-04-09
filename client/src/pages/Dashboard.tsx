import { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Server, Play, Eye, LogOut } from 'lucide-react';

export const Dashboard = () => {
  const [hosts, setHosts] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const { socket } = useContext(SocketContext);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHosts();
    if (socket) {
      socket.on('active_sessions_update', (sessions: any[]) => {
        setActiveSessions(sessions);
      });
    }
    return () => {
      if (socket) socket.off('active_sessions_update');
    };
  }, [socket]);

  const fetchHosts = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/hosts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setHosts(data.hosts);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartSession = (hostId: number) => {
    navigate(`/workspace?startHostId=${hostId}`);
  };

  const handleJoinSession = (sessionId: string) => {
    navigate(`/workspace?joinSessionId=${sessionId}`);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Olá, <b>{user?.username}</b></span>
          <button className="button button-outline" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Servers List */}
        <div className="card glass fade-in">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
            <Server size={20} color="var(--primary)" /> Meus Servidores
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {hosts.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum servidor cadastrado.</p> : null}
            {hosts.map(host => (
              <div key={host.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{host.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{host.username}@{host.host}:{host.port}</div>
                </div>
                <button className="button" style={{ padding: '0.5rem 1rem' }} onClick={() => handleStartSession(host.id)}>
                  <Play size={14} /> Conectar
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Active Team Sessions */}
        <div className="card glass fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
            <Eye size={20} color="var(--success)" /> Sessões da Equipe
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {activeSessions.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhuma sessão ativa no momento.</p> : null}
            {activeSessions.map(session => (
              <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{session.hostName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Iniciado por: {session.startedBy}</div>
                </div>
                <button className="button button-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => handleJoinSession(session.id)}>
                  Assistir
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
