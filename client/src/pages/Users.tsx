import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Users as UsersIcon, Plus, Edit2, Trash2, X, ShieldAlert } from 'lucide-react';

export const Users = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    username: '', // will be same as email for login
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setUsers(data.users);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }
    if (!editingUserId && !formData.password) {
      alert('A senha é obrigatória para um novo usuário.');
      return;
    }

    const payload = {
      username: formData.email, // using email as identifier
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
      role: formData.role
    };

    const token = localStorage.getItem('token');
    try {
      const url = editingUserId ? `/api/users/${editingUserId}` : `/api/users`;
      const method = editingUserId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingUserId(null);
        setFormData({ username: '', email: '', firstName: '', lastName: '', password: '', confirmPassword: '', role: 'user' });
        fetchUsers();
      } else {
        const errorData = await res.json();
        alert(errorData.error || `Erro ao ${editingUserId ? 'editar' : 'adicionar'} usuário`);
      }
    } catch (e) {
      alert('Erro na conexão com API');
    }
  };

  const handleEditClick = (u: any) => {
    setFormData({
      username: u.username,
      email: u.email || u.username,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      password: '',
      confirmPassword: '',
      role: u.role || 'user'
    });
    setEditingUserId(u.id);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (u: any) => {
    if (u.id === currentUser?.id) {
      alert('Você não pode excluir a si mesmo!');
      return;
    }
    if (!confirm(`Certeza que deseja remover o usuário ${u.email || u.username}?`)) return;
    
    const token = localStorage.getItem('token');
    await fetch(`/api/users/${u.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    fetchUsers();
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <UsersIcon size={28} color="var(--primary)" /> Gestão de Equipe
        </h1>
        <button className="button" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => {
          setEditingUserId(null);
          setFormData({ username: '', email: '', firstName: '', lastName: '', password: '', confirmPassword: '', role: 'user' });
          setIsModalOpen(true);
        }}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>
      
      <div className="card glass">
        {users.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum usuário encontrado.</p> : null}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : (u.email || u.username)}
                  {u.role === 'admin' && <span title="Administrador"><ShieldAlert size={14} color="var(--primary)" /></span>}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {u.email || u.username} {u.id === currentUser?.id ? '(Você)' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', textTransform: 'uppercase', marginRight: '0.5rem' }}>
                  {u.role}
                </span>

                <button className="icon-btn" style={{ color: 'var(--text-main)' }} onClick={() => handleEditClick(u)} title="Editar Usuário">
                  <Edit2 size={16} />
                </button>
                <button 
                  className="icon-btn danger" 
                  onClick={() => handleDeleteUser(u)} 
                  title={u.id === currentUser?.id ? "Ação Bloqueada" : "Remover Usuário"}
                  style={{ opacity: u.id === currentUser?.id ? 0.3 : 1, cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <UsersIcon size={20} color="var(--primary)" /> 
                {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Nome</label>
                  <input className="input" required placeholder="Ex: João" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Sobrenome</label>
                  <input className="input" required placeholder="Ex: Silva" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="input" type="email" required placeholder="joao@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Senha {editingUserId ? '(Deixe branco p/ manter)' : ''}</label>
                  <input className="input" type="password" required={!editingUserId} minLength={6} placeholder="********" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Confirmação de Senha</label>
                  <input className="input" type="password" required={!!formData.password} minLength={6} placeholder="********" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cargo / Nível de Acesso</label>
                <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="user">Usuário Padrão</option>
                  <option value="admin">Administrador Geral</option>
                </select>
              </div>
              
              <button className="button" style={{ width: '100%', marginTop: '1rem' }} type="submit">
                {editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
