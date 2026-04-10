import { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, X, Info } from 'lucide-react';

interface Sector {
  id: number;
  name: string;
  description: string;
}

export const Sectors = () => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/sectors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSectors(data.sectors);
    } catch (e) {
      console.error('Error fetching sectors:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (sector?: Sector) => {
    if (sector) {
      setEditingSector(sector);
      setFormData({
        name: sector.name,
        description: sector.description || ''
      });
    } else {
      setEditingSector(null);
      setFormData({
        name: '',
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveSector = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const url = editingSector ? `/api/sectors/${editingSector.id}` : '/api/sectors';
      const method = editingSector ? 'PUT' : 'POST';
      
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
        alert(data.error || 'Erro ao salvar setor');
      }
    } catch (e) {
      alert('Erro na conexão');
    }
  };

  const handleDeleteSector = async (sector: Sector) => {
    if (!confirm(`Certeza que deseja remover o setor "${sector.name}"?`)) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/sectors/${sector.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao remover setor');
      }
    } catch (e) {
      alert('Erro na conexão');
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <Layers size={28} color="var(--primary)" /> Gestão de Setores
        </h1>
        <button className="button" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Novo Setor
        </button>
      </div>

      <div className="card glass" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
        <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
          <Info size={24} color="var(--primary)" />
        </div>
        <div>
          <h4 style={{ margin: 0, color: 'var(--text-main)' }}>O que são Setores?</h4>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Setores permitem agrupar servidores e restringir o acesso de usuários. Usuários só enxergam hosts dos setores aos quais estão vinculados.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
          Carregando setores...
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {sectors.map(sector => (
            <div key={sector.id} className="card glass hover-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>{sector.name}</h3>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {sector.description || 'Sem descrição'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="icon-btn" onClick={() => handleOpenModal(sector)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="icon-btn danger" onClick={() => handleDeleteSector(sector)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {sectors.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Nenhum setor cadastrado.
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal fade-in" style={{ maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSector ? `Editar Setor: ${editingSector.name}` : 'Criar Novo Setor'}
              </h3>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSector}>
              <div className="form-group">
                <label className="form-label">Nome do Setor</label>
                <input 
                  className="input" 
                  required 
                  placeholder="Ex: Vendas, TI, RH" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descrição (Opcional)</label>
                <textarea 
                  className="input" 
                  style={{ minHeight: '100px', paddingTop: '0.5rem' }} 
                  placeholder="Para que serve este setor?" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <button className="button" style={{ width: '100%', marginTop: '1rem' }} type="submit">
                {editingSector ? 'Salvar Alterações' : 'Criar Setor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
