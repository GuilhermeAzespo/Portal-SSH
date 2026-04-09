import { Users as UsersIcon } from 'lucide-react';

export const Users = () => {
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <UsersIcon size={28} color="var(--primary)" /> Gestão de Usuários
        </h1>
      </div>
      <div className="card glass">
        <p style={{ color: 'var(--text-muted)' }}>Módulo de usuários em construção...</p>
      </div>
    </div>
  );
};
