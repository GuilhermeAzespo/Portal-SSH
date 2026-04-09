import { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Server, Play, Eye, LogOut, Plus, Trash2, X } from 'lucide-react';

export const Dashboard = () => {
  const [hosts, setHosts] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHost, setNewHost] = useState({
    name: '', host: '', port: 22, username: '', password: '', privateKey: ''
  });
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

  const handleAddHost = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/hosts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newHost)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewHost({ name: '', host: '', port: 22, username: '', password: '', privateKey: '' });
        fetchHosts();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao adicionar servidor');
      }
    } catch (e) {
      console.error(e);
      alert('Erro na conexão com API');
    }
  };

  const handleDeleteHost = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este servidor?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/hosts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchHosts();
    } catch (e) {
      console.error(e);
    }
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', margin: 0 }}>
              <Server size={20} color="var(--primary)" /> Meus Servidores
            </h2>
            {user?.role === 'admin' && (
              <button className="button" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> Adicionar
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {hosts.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum servidor cadastrado.</p> : null}
            {hosts.map(host => (
              <div key={host.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{host.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{host.username}@{host.host}:{host.port}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="button" style={{ padding: '0.5rem 1rem' }} onClick={() => handleStartSession(host.id)}>
                    <Play size={14} /> Conectar
                  </button>
                  {user?.role === 'admin' && (
                    <button className="icon-btn danger" onClick={() => handleDeleteHost(host.id)} title="Remover Servidor">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
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

      {/* Add Host Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title"><Server size={20} color="var(--primary)" /> Adicionar Servidor SSH</h3>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddHost}>
              <div className="form-group">
                <label className="form-label">Nome de Identificação</label>
                <input className="input" required placeholder="Ex: Servidor Produção AWS" value={newHost.name} onChange={e => setNewHost({...newHost, name: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 3 }}>
                  <label className="form-label">Endereço IP / Host</label>
                  <input className="input" required placeholder="192.168.1.100 ou ec2.aws.com" value={newHost.host} onChange={e => setNewHost({...newHost, host: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Porta</label>
                  <input className="input" type="number" required placeholder="22" value={newHost.port} onChange={e => setNewHost({...newHost, port: parseInt(e.target.value) || 22})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Usuário</label>
                <input className="input" required placeholder="Ex: root" value={newHost.username} onChange={e => setNewHost({...newHost, username: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Senha (Opcional se usar Chave)</label>
                <input className="input" type="password" placeholder="Senha do SSH" value={newHost.password} onChange={e => setNewHost({...newHost, password: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Chave Privada SSH (Opcional, formato PEM)</label>
                <textarea className="input" placeholder="-----BEGIN RSA PRIVATE KEY-----..." value={newHost.privateKey} onChange={e => setNewHost({...newHost, privateKey: e.target.value})} />
              </div>
              
              <button className="button" style={{ width: '100%', marginTop: '1rem' }} type="submit">
                Cadastrar Servidor
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
