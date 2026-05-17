import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import './AdminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  // For breadcrumbs
  breadcrumbs?: Array<{ label: string; path?: string }>;
}

// Navigation items configuration
interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  badge?: string | null;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_ITEMS: NavGroup[] = [
  {
    group: 'Operate',
    items: [
      { path: '/admin', label: 'Dashboard', icon: '\u25A6', exact: true },
      { path: '/admin/users', label: 'Users', icon: '\u2399' },
      { path: '/admin/applications', label: 'Applications', icon: '\u2605' },
      { path: '/admin/fairs', label: 'Fairs', icon: '\u229E' },
      { path: '/admin/map', label: 'Map editor', icon: '\u2295' },
    ],
  },
  {
    group: 'Content',
    items: [
      { path: '/admin/about-us', label: 'About page', icon: '\u00B6' },
      { path: '/admin/logs', label: 'Audit log', icon: '\u2318' },
    ],
  },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
}) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'A';
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Build breadcrumb path
  const getBreadcrumbPath = () => {
    if (breadcrumbs) {
      return breadcrumbs;
    }
    // Default breadcrumb based on current path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length <= 1) {
      return [{ label: 'Admin' }];
    }
    return [
      { label: 'Admin', path: '/admin' },
      { label: title },
    ];
  };

  const crumbs = getBreadcrumbPath();

  return (
    <div className="ad-shell">
      {/* Sidebar */}
      <aside className="ad-side">
        <div className="brand">
          <span className="dot"></span>
          FestivKids
        </div>

        <div className="who">
          <div className="av">{getUserInitials()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{user?.firstName || user?.email?.split('@')[0] || 'Admin'}</b>
            <span>Administrator</span>
          </div>
        </div>

        <nav className="ad-nav">
          {NAV_ITEMS.map((group) => (
            <React.Fragment key={group.group}>
              <div className="grp">{group.group}</div>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={isActive(item.path, item.exact) ? 'active' : ''}
                >
                  <span className="ico">{item.icon}</span>
                  {item.label}
                  {item.badge && <span className="badge">{item.badge}</span>}
                </Link>
              ))}
            </React.Fragment>
          ))}

          <div className="grp">Account</div>
          <Link to="/">
            <span className="ico">{'\u2190'}</span>
            Back to site
          </Link>
          <button onClick={handleLogout}>
            <span className="ico">{'\u23FB'}</span>
            {t('auth.logout')}
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <div className="ad-main">
        {/* Top bar */}
        <div className="ad-top">
          <div className="crumbs">
            {crumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && ' / '}
                {crumb.path ? (
                  <Link to={crumb.path}>{crumb.label}</Link>
                ) : (
                  <span className="here">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="search">
            <span style={{ fontSize: '14px' }}>{'\u2315'}</span>
            <input placeholder={t('common.search', 'Search...')} />
            <span className="kbd">{'\u2318'}K</span>
          </div>

          <div className="right">
            <span className="pill">
              <span className="dot"></span>
              EN
            </span>
            <span className="pill ok">
              <span className="dot"></span>
              System nominal
            </span>
          </div>
        </div>

        {/* Page content */}
        <div className="ad-page">
          <div className="hdr">
            <div>
              <h2>{title}</h2>
              {subtitle && <div className="lede">{subtitle}</div>}
            </div>
            {actions && <div className="actions">{actions}</div>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
