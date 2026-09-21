import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/admin/tickets', label: 'Tickets', icon: '🎫' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: '📋' },
];

const PAGE_TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/tickets': 'Tickets',
  '/admin/audit-logs': 'Audit Logs',
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) => location.pathname.startsWith(path))?.[1] || 'Admin';

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className={`al-layout${expanded ? ' expanded' : ''}`}>
      <aside className="al-sidebar">
        <div className="al-logo">
          <img
            src={expanded ? '/src/assets/images/logo.png' : '/src/assets/images/favicon.ico'}
            alt="vSmart"
            className={expanded ? 'al-logo-img' : 'al-logo-favicon'}
          />
        </div>

        <nav className="al-nav">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              data-label={n.label}
              className={({ isActive }) => `al-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="al-nav-icon">{n.icon}</span>
              <span className="al-nav-label">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="al-sidebar-bottom">
          <button className="al-logout" data-label="Logout" onClick={handleLogout}>
            <span className="al-nav-icon">⏻</span>
            <span className="al-nav-label">Logout</span>
          </button>
        </div>
      </aside>

      <div className="al-main">
        <header className="al-topbar">
          <div className="al-topbar-left">
            <button className="al-toggle" onClick={() => setExpanded(p => !p)}>☰</button>
            <span className="al-topbar-title">{pageTitle}</span>
          </div>
          <div className="al-topbar-right">
            <button className="al-topbar-btn" title="Notifications">
              🔔
              <span className="al-notif-dot" />
            </button>
            <Link to="/admin/profile" className="al-user-menu">
              <div className="al-avatar">{user?.name?.[0]?.toUpperCase()}</div>
              <div className="al-user-info">
                <span className="al-username">{user?.name}</span>
                <span className="al-role">{user?.role?.replace('_', ' ')}</span>
              </div>
            </Link>
          </div>
        </header>

        <main className="al-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
