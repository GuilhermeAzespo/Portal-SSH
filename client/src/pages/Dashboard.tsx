import { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Server, Play, Eye, Plus, Trash2, X, Edit2, Radio } from 'lucide-react';

export const Dashboard = () => {
  const [hosts, setHosts] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHostId, setEditingHostId] = useState<number | null>(null);
  const [newHost, setNewHost] = useState({
    name: '', host: '', port: 22, username: '', password: '', privateKey: '', sectorId: ''
  });
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const { tabs, setActiveTab } = useWorkspaceStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHosts();
    fetchSectors();
    if (socket) {
      socket.on('active_sessions_update', (sessions: any[]) => {
        setActiveSessions(sessions);
      });
      socket.emit('get_active_sessions');
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

  const fetchSectors = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/sectors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSectors(data.sectors);
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
      const url = editingHostId ? `/api/hosts/${editingHostId}` : `/api/hosts`;
      const method = editingHostId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newHost,
          sectorId: newHost.sectorId === '' ? null : parseInt(newHost.sectorId)
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingHostId(null);
        setNewHost({ name: '', host: '', port: 22, username: '', password: '', privateKey: '', sectorId: '' });
        fetchHosts();
      } else {
        const errorData = await res.json();
        alert(errorData.error || `Erro ao ${editingHostId ? 'editar' : 'adicionar'} servidor`);
      }
    } catch (e) {
      console.error(e);
      alert('Erro na conexão com API');
    }
  };

  const handleEditClick = (host: any) => {
    setNewHost({
      name: host.name,
      host: host.host,
      port: host.port,
      username: host.username,
      password: '',
      privateKey: '',
      sectorId: host.sectorId ? host.sectorId.toString() : ''
    });
    setEditingHostId(host.id);
    setIsModalOpen(true);
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
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          <Server size={26} />
          Gestão de Servidores
        </h1>
        {user?.role === 'admin' && (
          <button className="button" onClick={() => {
            setEditingHostId(null);
            setNewHost({ name: '', host: '', port: 22, username: '', password: '', privateKey: '', sectorId: '' });
            setIsModalOpen(true);
          }}>
            <Plus size={16} /> Novo Servidor
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>

        {/* Servers List */}
        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', margin: 0, fontWeight: 600 }}>
              <Server size={18} color="var(--primary)" />
              Meus Servidores
              <span className="badge badge-primary" style={{ marginLeft: '0.25rem' }}>{hosts.length}</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {hosts.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '2rem 1rem',
                color: 'var(--text-muted)', fontSize: '0.875rem',
                border: '1px dashed var(--border-light)', borderRadius: '8px',
              }}>
                <Server size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0 }}>Nenhum servidor cadastrado</p>
              </div>
            ) : null}

            {hosts.map(host => {
              const activeTab = tabs.find(t => t.title === host.name);
              return (
                <div key={host.id} className="host-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {host.name}
                      {host.sectorName && (
                        <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>{host.sectorName}</span>
                      )}
                      {activeTab && <span className="badge badge-success">ativo</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                      {host.username}@{host.host}:{host.port}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexShrink: 0 }}>
                    {activeTab ? (
                      <button
                        className="button button-outline"
                        style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                        onClick={() => { setActiveTab(activeTab.id); navigate('/workspace'); }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                        Aberto
                      </button>
                    ) : (
                      <button
                        className="button"
                        style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
                        onClick={() => handleStartSession(host.id)}
                      >
                        <Play size={13} fill="currentColor" /> Conectar
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <>
                        <button className="icon-btn" onClick={() => handleEditClick(host)} title="Editar">
                          <Edit2 size={15} />
                        </button>
                        <button className="icon-btn danger" onClick={() => handleDeleteHost(host.id)} title="Remover">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Sessions */}
        <div className="card glass" style={{ animationDelay: '0.08s' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', margin: 0, fontWeight: 600 }}>
              <Radio size={18} color="var(--success)" />
              Sessões da Equipe
              {activeSessions.length > 0 && (
                <span className="badge badge-success" style={{ marginLeft: '0.25rem' }}>{activeSessions.length} live</span>
              )}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {activeSessions.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '2rem 1rem',
                color: 'var(--text-muted)', fontSize: '0.875rem',
                border: '1px dashed var(--border-light)', borderRadius: '8px',
              }}>
                <Eye size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0 }}>Nenhuma sessão ativa no momento</p>
              </div>
            ) : null}

            {activeSessions.map(session => (
              <div key={session.id} className="session-row">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {session.hostName}
                    {session.sectorName && (
                      <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                        {session.sectorName}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                    ● iniciado por {session.startedBy}
                  </div>
                </div>

                <button
                  className="button button-outline"
                  style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                  onClick={() => handleJoinSession(session.id)}
                >
                  <Eye size={13} /> Assistir
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Host Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Server size={18} color="var(--primary)" />
                {editingHostId ? 'Editar Servidor SSH' : 'Adicionar Servidor SSH'}
              </h3>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddHost}>
              <div className="form-group">
                <label className="form-label">Setor</label>
                <select
                  className="input"
                  value={newHost.sectorId}
                  onChange={e => setNewHost({...newHost, sectorId: e.target.value})}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">Nenhum Setor (Geral)</option>
                  {sectors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nome de Identificação</label>
                <input className="input" required placeholder="Ex: Servidor Produção AWS" value={newHost.name} onChange={e => setNewHost({...newHost, name: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 3 }}>
                  <label className="form-label">Endereço IP / Host</label>
                  <input className="input" required placeholder="192.168.1.100" value={newHost.host} onChange={e => setNewHost({...newHost, host: e.target.value})} />
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
                <label className="form-label">Senha {editingHostId ? '(Deixe em branco para manter)' : '(Opcional)'}</label>
                <input className="input" type="password" placeholder="Senha do SSH" value={newHost.password} onChange={e => setNewHost({...newHost, password: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Chave Privada SSH {editingHostId ? '(Deixe em branco para manter)' : '(Opcional)'}</label>
                <textarea className="input" placeholder="-----BEGIN RSA PRIVATE KEY-----..." value={newHost.privateKey} onChange={e => setNewHost({...newHost, privateKey: e.target.value})} />
              </div>

              <button className="button" style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }} type="submit">
                {editingHostId ? 'Salvar Alterações' : 'Cadastrar Servidor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
