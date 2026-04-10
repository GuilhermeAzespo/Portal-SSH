import { useState, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Terminal, LayoutDashboard, Users, Shield, Settings, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

export const MainLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ '/settings': true });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { path: '/users', label: 'Usuários', icon: Users, permission: 'users.view' },
    { path: '/permissions', label: 'Permissões', icon: Shield, permission: 'permissions.manage' },
    { 
      path: '/settings', label: 'Configurações', icon: Settings, permission: 'settings.view',
      children: [
        { path: '/settings', label: 'Atualizações' }
      ]
    },
  ];

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (user?.role === 'admin') return true;
    return user?.permissions?.includes(permission);
  };

  const toggleMenu = (path: string) => {
    setOpenMenus(prev => ({ ...prev, [path]: !prev[path] }));
  };

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
            if (!hasPermission(item.permission)) return null;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <div key={item.path}>
                <button 
                  className={`sidebar-link ${isActive && !item.children ? 'active' : ''}`}
                  onClick={() => {
                    if (item.children) {
                      toggleMenu(item.path);
                    } else {
                      navigate(item.path);
                    }
                  }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <item.icon size={18} />
                    {item.label}
                  </div>
                  {item.children && (
                    openMenus[item.path] ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </button>
                
                {item.children && openMenus[item.path] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', paddingLeft: '2.5rem' }}>
                    {item.children.map(child => (
                      <button
                        key={child.path}
                        className={`sidebar-link ${location.pathname === child.path ? 'active' : ''}`}
                        onClick={() => navigate(child.path)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Olá, <b style={{ color: 'var(--text-main)' }}>{user?.username}</b>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Papel: {user?.roleName || user?.role}</div>
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
