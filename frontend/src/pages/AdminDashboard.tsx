import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { adminApi } from '../services/api';
import UserManagement from './UserManagement';
import AdminLogs from './AdminLogs';
import FairManagement from './FairManagement';
import ApplicationReview from './ApplicationReview';
import AboutUsEditor from './AboutUsEditor';
import MapManagement from './MapManagement';
import AnalyticsDashboard from './AnalyticsDashboard';
import ZoneManagement from './ZoneManagement';
import EventManagement from './EventManagement';
import BannerManagement from './BannerManagement';
import '../styles/admin-design-system.css';
import './AdminDashboard.css';

// Navigation items configuration
const NAV_ITEMS = [
  {
    group: 'Operate',
    items: [
      { path: '/admin', label: 'Dashboard', icon: '\u25A6', exact: true },
      { path: '/admin/users', label: 'Users', icon: '\u2399' },
      { path: '/admin/applications', label: 'Applications', icon: '\u2605' },
      { path: '/admin/fairs', label: 'Fairs', icon: '\u229E' },
      { path: '/admin/map', label: 'Map editor', icon: '\u2295' },
      { path: '/admin/zones', label: 'Zones', icon: '\u25ca' },
      { path: '/admin/analytics', label: 'Analytics', icon: '\u25eb' },
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

// Admin home/overview component - FestivKids style
const AdminHome: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    adminApi
      .getApplicationStats()
      .then((s) => setPendingCount(s.pending))
      .catch(() => setPendingCount(null));
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      <div className="hdr">
        <div>
          <h2>{getGreeting()}, {user?.firstName || 'Admin'}</h2>
          <div className="lede">{t('adminDashboard.loggedInAsAdmin')}</div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="stats-fk">
        <div className="stat-fk">
          <div className="k">Active Fairs</div>
          <div className="v">2</div>
          <div className="d">Winter &amp; Spring</div>
        </div>
        <div className="stat-fk">
          <div className="k">Vendors</div>
          <div className="v">48</div>
          <div className="d"><span className="up">+12%</span> from last month</div>
        </div>
        <div className="stat-fk">
          <div className="k">Pending</div>
          <div className="v">{pendingCount ?? '—'}</div>
          <div className="d">Applications</div>
        </div>
        <div className="stat-fk">
          <div className="k">Users</div>
          <div className="v">156</div>
          <div className="d"><span className="up">+8%</span> growth</div>
        </div>
      </div>

      {/* Quick actions grid */}
      <div className="fairs-grid" style={{ marginTop: '12px' }}>
        <Link to="/admin/fairs" className="fair-card" style={{ textDecoration: 'none' }}>
          <div className="cover winter"></div>
          <div className="body">
            <h3>{t('admin.fairManagement')}</h3>
            <div className="when">{t('adminDashboard.manageFairsDesc')}</div>
          </div>
        </Link>

        <Link to="/admin/applications" className="fair-card" style={{ textDecoration: 'none' }}>
          <div className="cover spring"></div>
          <div className="body">
            <h3>{t('admin.applicationReview')}</h3>
            <div className="when">{t('adminDashboard.reviewApplicationsDesc')}</div>
          </div>
        </Link>

        <Link to="/admin/map" className="fair-card" style={{ textDecoration: 'none' }}>
          <div className="cover summer"></div>
          <div className="body">
            <h3>{t('admin.mapManagement')}</h3>
            <div className="when">{t('adminDashboard.configureMapDesc')}</div>
          </div>
        </Link>

        <Link to="/admin/users" className="fair-card" style={{ textDecoration: 'none' }}>
          <div className="cover autumn"></div>
          <div className="body">
            <h3>{t('admin.userManagement')}</h3>
            <div className="when">{t('adminDashboard.manageUsersDesc')}</div>
          </div>
        </Link>

        <Link to="/admin/logs" className="fair-card" style={{ textDecoration: 'none' }}>
          <div className="cover winter"></div>
          <div className="body">
            <h3>{t('admin.adminLogs')}</h3>
            <div className="when">{t('adminDashboard.viewLogsDesc')}</div>
          </div>
        </Link>

        <Link to="/admin/about-us" className="fair-card" style={{ textDecoration: 'none' }}>
          <div className="cover spring"></div>
          <div className="body">
            <h3>{t('admin.aboutUsEditor')}</h3>
            <div className="when">{t('adminDashboard.editAboutDesc')}</div>
          </div>
        </Link>

        <Link to="/admin/analytics" className="fair-card" style={{ textDecoration: 'none' }}>
          <div className="cover summer"></div>
          <div className="body">
            <h3>{t('admin.analytics', 'Vendor analytics')}</h3>
            <div className="when">
              {t('adminDashboard.analyticsDesc', 'Which houses get the most attention from visitors')}
            </div>
          </div>
        </Link>

        <Link to="/admin/zones" className="fair-card" style={{ textDecoration: 'none' }}>
          <div className="cover autumn"></div>
          <div className="body">
            <h3>{t('admin.zones', 'Map zones')}</h3>
            <div className="when">
              {t('adminDashboard.zonesDesc', 'Outline food courts, kids zones, VIP areas on the visitor map')}
            </div>
          </div>
        </Link>
      </div>
    </>
  );
};

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Get current page name for breadcrumbs
  const getCurrentPageLabel = () => {
    const routeLabels: Record<string, string> = {
      'fairs': t('admin.fairManagement', { defaultValue: 'Fairs' }),
      'applications': t('admin.applicationReview', { defaultValue: 'Applications' }),
      'users': t('admin.userManagement', { defaultValue: 'Users' }),
      'logs': t('admin.adminLogs', { defaultValue: 'Audit log' }),
      'about-us': t('admin.aboutUsEditor', { defaultValue: 'About page' }),
      'map': t('admin.mapManagement', { defaultValue: 'Map editor' }),
      'zones': t('admin.zones', { defaultValue: 'Zones' }),
      'analytics': t('admin.analytics', { defaultValue: 'Analytics' }),
    };
    const subPath = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
    return routeLabels[subPath] || 'Dashboard';
  };

  const isSubRoute = location.pathname !== '/admin' && location.pathname !== '/admin/';

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
            <Link to="/admin">Admin</Link>
            {isSubRoute && (
              <>
                {' / '}
                <span className="here">{getCurrentPageLabel()}</span>
              </>
            )}
          </div>

          <div className="search">
            <span style={{ fontSize: '14px' }}>{'\u2315'}</span>
            <input placeholder={t('common.search', 'Search...')} />
            <span className="kbd">{'\u2318'}K</span>
          </div>

          <div className="right">
            <span className="pill ok">
              <span className="dot"></span>
              System nominal
            </span>
          </div>
        </div>

        {/* Page content */}
        <div className="ad-page">
          <Routes>
            <Route path="/" element={<AdminHome />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/logs" element={<AdminLogs />} />
            <Route path="/fairs" element={<FairManagement />} />
            <Route path="/applications" element={<ApplicationReview />} />
            <Route path="/about-us" element={<AboutUsEditor />} />
            <Route path="/map" element={<MapManagement />} />
            <Route path="/zones" element={<ZoneManagement />} />
            <Route path="/events" element={<EventManagement />} />
            <Route path="/banners" element={<BannerManagement />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
