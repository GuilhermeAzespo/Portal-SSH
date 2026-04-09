import { Settings as SettingsIcon } from 'lucide-react';

export const Settings = () => {
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <SettingsIcon size={28} color="var(--primary)" /> Configurações do Sistema
        </h1>
      </div>
      <div className="card glass">
        <p style={{ color: 'var(--text-muted)' }}>Módulo de configurações em construção...</p>
      </div>
    </div>
  );
};
