import { useState, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { LayoutDashboard, Users, Shield, Settings, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

export const MainLayout = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [openMenus, setOpenMenus] = useState({ '/settings': true });

    const handleLogout = () => {
          logout();
          navigate('/login');
    };

    const navItems = [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
      { path: '/users', label: 'Usuarios', icon: Users, permission: 'users.view' },
      { path: '/permissions', label: 'Permissoes', icon: Shield, permission: 'permissions.manage' },
      {
              path: '/settings', label: 'Configuracoes', icon: Settings, permission: 'settings.view',
              children: [
                { path: '/settings', label: 'Atualizacoes' }
                      ]
      },
        ];

    const hasPermission = (p) => {
          if (!p) return true;
          if (user?.role === 'admin') return true;
          return user?.permissions?.includes(p);
    };

    const toggleMenu = (path) => {
          setOpenMenus(prev => ({ ...prev, [path]: !prev[path] }));
    };

    const avatar = user?.username ? user.username.slice(0, 2).toUpperCase() : '??';

    return (
          <div className="layout-container">
                <aside className="sidebar">
                        <div className="sidebar-header">
                                  <div className="sidebar-logo">>_</div>div>
                                  <div className="sidebar-brand">
                                              <h2 className="sidebar-title">Portal <span>SSH</span>span></h2>h2>
                                              <span className="sidebar-subtitle">v2.0.0 - secure shell</span>span>
                                  </div>div>
                        </div>div>
                
                        <nav className="sidebar-nav">
                                  <span className="sidebar-section-label">Navegacao</span>span>
                          {navItems.map((item) => {
                        if (!hasPermission(item.permission)) return null;
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                                        <div key={item.path}>
                                                        <button
                                                                            className={`sidebar-link ${isActive && !item.children ? 'active' : ''}`}
                                                                            onClick={() => item.children ? toggleMenu(item.path) : navigate(item.path)}
                                                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                                          >
                                                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                                                                              <item.icon size={17} />
                                                                            {item.label}
                                                                          </div>div>
                                                          {item.children && (openMenus[item.path] ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                                        </button>button>
                                        
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
                                                                                      </button>button>
                                                                                  ))}
                                                            </div>div>
                                                        )}
                                        </div>div>
                                      );
          })}
                        </nav>nav>
                
                        <div className="sidebar-footer">
                                  <div className="sidebar-user">
                                              <div className="sidebar-avatar">{avatar}</div>div>
                                              <div className="sidebar-user-info">
                                                            <div className="sidebar-username">{user?.username}</div>div>
                                                            <div className="sidebar-role">{user?.roleName || user?.role}</div>div>
                                              </div>div>
                                  </div>div>
                                  <button
                                                className="sidebar-link"
                                                onClick={handleLogout}
                                                style={{ color: 'var(--danger)', gap: '0.625rem' }}
                                              >
                                              <LogOut size={16} />
                                              Sair
                                  </button>button>
                                  <div className="sidebar-version">v2.0.0</div>div>
                        </div>div>
                </aside>aside>
          
                <main className="main-content">
                        <Outlet />
                </main>main>
          </div>div>
        );
};
</div>
