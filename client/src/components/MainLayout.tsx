import { useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Terminal, LayoutDashboard, Users, Shield, Settings, LogOut } from 'lucide-react';

export const MainLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { path: '/users', label: 'Usuários', icon: Users, adminOnly: true },
    { path: '/permissions', label: 'Permissões', icon: Shield, adminOnly: true },
    { path: '/settings', label: 'Configurações', icon: Settings, adminOnly: true },
  ];

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
            <Terminal size={24} color="white" />
          </div>
          <h2 className="sidebar-title">Portal SSH</h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button 
                key={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Olá, <b style={{ color: 'var(--text-main)' }}>{user?.username}</b>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Papel: {user?.role}</div>
          </div>
          <button className="sidebar-link" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
            <LogOut size={18} />
            Sair da Plataforma
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
