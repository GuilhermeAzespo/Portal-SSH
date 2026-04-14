import { useState, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { LayoutDashboard, Users, Shield, Settings, LogOut, ChevronDown, ChevronUp , Layers} from 'lucide-react';

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
    { path: '/sectors', label: 'Setores', icon: Layers, permission: 'sectors.view' },
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

  const avatarInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">{'>_'}</div>
          <div className="sidebar-brand">
            <h2 className="sidebar-title">Portal <span>SSH</span></h2>
            <span className="sidebar-subtitle">2.3.8 · secure shell</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Navegação</span>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <item.icon size={17} />
                    {item.label}
                  </div>
                  {item.children && (
                    openMenus[item.path] ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </button>

                {item.children && openMenus[item.path] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingLeft: '2.25rem', marginTop: '0.15rem' }}>
                    {item.children.map(child => (
                      <button
                        key={child.path}
                        className={`sidebar-link ${location.pathname === child.path ? 'active' : ''}`}
                        onClick={() => navigate(child.path)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
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
          <div className="sidebar-user">
            <div className="sidebar-avatar">{avatarInitials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-username">{user?.username}</div>
              <div className="sidebar-role">{user?.roleName || user?.role}</div>
            </div>
          </div>
          <button
            className="sidebar-link"
            onClick={handleLogout}
            style={{ color: 'var(--danger)', gap: '0.625rem' }}
          >
            <LogOut size={16} />
            Sair da Plataforma
          </button>
          <div className="sidebar-version">Portal SSH © {new Date().getFullYear()}</div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
