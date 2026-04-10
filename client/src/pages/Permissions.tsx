import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, X, Check, Lock } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

interface Permission {
  id: string;
  label: string;
  group: string;
}

export const Permissions = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  const fetchData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/roles/permissions', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();
      
      if (rolesRes.ok) setRoles(rolesData.roles);
      if (permsRes.ok) setAvailablePermissions(permsData.permissions);
    } catch (e) {
      console.error('Error fetching roles:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permissions: []
      });
    }
    setIsModalOpen(true);
  };

  const handleTogglePermission = (id: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter(p => p !== id)
        : [...prev.permissions, id]
    }));
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar cargo');
      }
    } catch (e) {
      alert('Erro na conexão');
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.name === 'Administrador') {
      alert('O cargo de Administrador não pode ser removido.');
      return;
    }

    if (!confirm(`Certeza que deseja remover o cargo "${role.name}"?`)) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao remover cargo');
      }
    } catch (e) {
      alert('Erro na conexão');
    }
  };

  const permissionGroups = Array.from(new Set(availablePermissions.map(p => p.group)));

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <Shield size={28} color="var(--primary)" /> Permissões de Acesso
        </h1>
        <button className="button" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Novo Cargo
        </button>
      </div>

      {isLoading ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
          Carregando cargos...
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {roles.map(role => (
            <div key={role.id} className="card glass hover-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>{role.name}</h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{role.description || 'Sem descrição'}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="icon-btn" onClick={() => handleOpenModal(role)}>
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="icon-btn danger" 
                    onClick={() => handleDeleteRole(role)}
                    disabled={role.name === 'Administrador'}
                    style={{ opacity: role.name === 'Administrador' ? 0.3 : 1 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                   <Lock size={12} /> {role.permissions.length} Permissões Ativas
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {role.permissions.map(p => (
                    <span key={p} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '4px', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
                      {p.split('.')[1]}
                    </span>
                  ))}
                  {role.permissions.length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nenhuma permissão</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal fade-in" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Shield size={20} color="var(--primary)" />
                {editingRole ? `Editar Cargo: ${editingRole.name}` : 'Criar Novo Cargo'}
              </h3>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRole}>
              <div className="form-group">
                <label className="form-label">Nome do Cargo</label>
                <input 
                  className="input" 
                  required 
                  placeholder="Ex: Operador de Redes" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  disabled={editingRole?.name === 'Administrador'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea 
                  className="input" 
                  style={{ minHeight: '80px', paddingTop: '0.5rem' }} 
                  placeholder="Descreva o que este cargo pode fazer..." 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Permissões Específicas</label>
                <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {permissionGroups.map(group => (
                    <div key={group} style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem' }}>
                        {group}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {availablePermissions.filter(p => p.group === group).map(perm => (
                          <div 
                            key={perm.id} 
                            onClick={() => handleTogglePermission(perm.id)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.75rem', 
                              padding: '0.5rem', 
                              background: 'rgba(255,255,255,0.03)', 
                              borderRadius: '6px',
                              cursor: 'pointer',
                              border: formData.permissions.includes(perm.id) ? '1px solid var(--primary)' : '1px solid transparent',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ 
                              width: '18px', 
                              height: '18px', 
                              borderRadius: '4px', 
                              border: '2px solid var(--primary)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              background: formData.permissions.includes(perm.id) ? 'var(--primary)' : 'transparent'
                            }}>
                              {formData.permissions.includes(perm.id) && <Check size={14} color="white" />}
                            </div>
                            <span style={{ fontSize: '0.875rem' }}>{perm.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="button" style={{ width: '100%', marginTop: '1rem' }} type="submit">
                {editingRole ? 'Salvar Alterações' : 'Criar Cargo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
