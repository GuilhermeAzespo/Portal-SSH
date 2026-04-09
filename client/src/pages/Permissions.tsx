import { Shield } from 'lucide-react';

export const Permissions = () => {
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <Shield size={28} color="var(--primary)" /> Permissões de Acesso
        </h1>
      </div>
      <div className="card glass">
        <p style={{ color: 'var(--text-muted)' }}>Módulo de permissões em construção...</p>
      </div>
    </div>
  );
};
