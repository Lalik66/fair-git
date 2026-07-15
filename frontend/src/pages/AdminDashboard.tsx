import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { adminApi } from '../services/api';
import AdminSearchBox from '../components/admin/AdminSearchBox';
import UserManagement from './UserManagement';
import AdminLogs from './AdminLogs';
import FairManagement from './FairManagement';
import ApplicationReview from './ApplicationReview';
import AboutUsEditor from './AboutUsEditor';
import MapManagement from './MapManagement';
import AnalyticsDashboard from './AnalyticsDashboard';
import ZoneManagement from './ZoneManagement';
import EventManagement from './EventManagement';
import QRGenerator from './QRGenerator';
import BannerManagement from './BannerManagement';
import '../styles/admin-design-system.css';
import './AdminDashboard.css';

// Navigation items configuration. Labels are i18n keys resolved at render
// time (module-level const, so t() can't run here).
const NAV_ITEMS = [
  {
    groupKey: 'adminDashboard.groupOperate',
    items: [
      { path: '/admin', labelKey: 'adminDashboard.nav.dashboard', icon: '\u25a6', exact: true },
      { path: '/admin/users', labelKey: 'adminDashboard.nav.users', icon: '\u2399' },
      { path: '/admin/applications', labelKey: 'adminDashboard.nav.applications', icon: '\u2605' },
      { path: '/admin/fairs', labelKey: 'adminDashboard.nav.fairs', icon: '\u229E' },
      { path: '/admin/map', labelKey: 'adminDashboard.nav.mapEditor', icon: '\u2295' },
      { path: '/admin/zones', labelKey: 'adminDashboard.nav.zones', icon: '\u25ca' },
      { path: '/admin/events', labelKey: 'adminDashboard.nav.events', icon: '\u2691' },
      { path: '/admin/qr', labelKey: 'adminDashboard.nav.qr', icon: '\u25a6' },
      { path: '/admin/banners', labelKey: 'adminDashboard.nav.banners', icon: '\u25e8' },
      { path: '/admin/analytics', labelKey: 'adminDashboard.nav.analytics', icon: '\u25eb' },
    ],
  },
  {
    groupKey: 'adminDashboard.groupContent',
    items: [
      { path: '/admin/about-us', labelKey: 'adminDashboard.nav.aboutPage', icon: '\u00B6' },
      { path: '/admin/logs', labelKey: 'adminDashboard.nav.auditLog', icon: '\u2318' },
    ],
  },
];

interface DashboardStats {
  activeFairs: number;
  activeFairNames: string[];
  vendors: number;
  users: number;
  newVendors30d: number;
  newUsers30d: number;
}

// Growth over the trailing 30 days, relative to the count before that window.
// Null when there is no baseline to compare against (all accounts are new).
const growthPct = (total: number, recent: number): number | null => {
  const previous = total - recent;
  if (previous <= 0) return null;
  return Math.round((recent / previous) * 100);
};

// Admin home/overview component - FestivKids style
const AdminHome: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    adminApi
      .getApplicationStats()
      .then((s) => setPendingCount(s.pending))
      .catch(() => setPendingCount(null));
    adminApi
      .getDashboardStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const vendorGrowth = stats ? growthPct(stats.vendors, stats.newVendors30d) : null;
  const userGrowth = stats ? growthPct(stats.users, stats.newUsers30d) : null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('adminDashboard.greetingMorning');
    if (hour < 18) return t('adminDashboard.greetingAfternoon');
    return t('adminDashboard.greetingEvening');
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
          <div className="k">{t('adminDashboard.statActiveFairs')}</div>
          <div className="v">{stats?.activeFairs ?? '—'}</div>
          <div className="d">
            {stats && stats.activeFairNames.length > 0 ? stats.activeFairNames.join(' & ') : '—'}
          </div>
        </div>
        <div className="stat-fk">
          <div className="k">{t('adminDashboard.statVendors')}</div>
          <div className="v">{stats?.vendors ?? '—'}</div>
          <div className="d">
            {vendorGrowth !== null ? (
              <><span className="up">+{vendorGrowth}%</span> {t('adminDashboard.statVendorsDesc')}</>
            ) : '—'}
          </div>
        </div>
        <div className="stat-fk">
          <div className="k">{t('adminDashboard.statPending')}</div>
          <div className="v">{pendingCount ?? '—'}</div>
          <div className="d">{t('adminDashboard.statPendingDesc')}</div>
        </div>
        <div className="stat-fk">
          <div className="k">{t('adminDashboard.statUsers')}</div>
          <div className="v">{stats?.users ?? '—'}</div>
          <div className="d">
            {userGrowth !== null ? (
              <><span className="up">+{userGrowth}%</span> {t('adminDashboard.statUsersDesc')}</>
            ) : '—'}
          </div>
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
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

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
      'events': t('admin.events', { defaultValue: 'Events' }),
      'qr': t('admin.qrCodes', { defaultValue: 'QR codes' }),
      'banners': t('admin.banners', { defaultValue: 'Banners' }),
      'analytics': t('admin.analytics', { defaultValue: 'Analytics' }),
    };
    const subPath = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
    return routeLabels[subPath] || t('adminDashboard.nav.dashboard');
  };

  const isSubRoute = location.pathname !== '/admin' && location.pathname !== '/admin/';

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const active = document.activeElement;
        const inEditable =
          active instanceof HTMLElement &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.isContentEditable);
        if (inEditable && active !== searchInputRef.current) return;
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const getSearchPlaceholder = () => {
    const subPath = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
    const map: Record<string, string> = {
      map: t('adminSearch.placeholder.map', { defaultValue: 'Search houses and facilities…' }),
      events: t('adminSearch.placeholder.events', { defaultValue: 'Search events…' }),
      banners: t('adminSearch.placeholder.banners', { defaultValue: 'Search banners…' }),
      applications: t('adminSearch.placeholder.applications', { defaultValue: 'Search applicants…' }),
      users: t('adminSearch.placeholder.users', { defaultValue: 'Search users…' }),
      fairs: t('adminSearch.placeholder.fairs', { defaultValue: 'Search fairs…' }),
    };
    return map[subPath] ?? t('common.search', 'Search...');
  };

  return (
    <div className="ad-shell">
      {/* Sidebar */}
      <aside className={`ad-side${navOpen ? ' is-open' : ''}`}>
        <div className="brand">
          <span className="dot"></span>
          FestivKids
        </div>

        <div className="who">
          <div className="av">{getUserInitials()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{user?.firstName || user?.email?.split('@')[0] || 'Admin'}</b>
            <span>{t('adminDashboard.administrator')}</span>
          </div>
        </div>

        <nav className="ad-nav">
          {NAV_ITEMS.map((group) => (
            <React.Fragment key={group.groupKey}>
              <div className="grp">{t(group.groupKey)}</div>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeNav}
                  className={isActive(item.path, item.exact) ? 'active' : ''}
                >
                  <span className="ico">{item.icon}</span>
                  {t(item.labelKey)}
                </Link>
              ))}
            </React.Fragment>
          ))}

          <div className="grp">{t('adminDashboard.account')}</div>
          <Link to="/" onClick={closeNav}>
            <span className="ico">{'\u2190'}</span>
            {t('adminDashboard.backToSite')}
          </Link>
          <button onClick={handleLogout}>
            <span className="ico">{'\u23FB'}</span>
            {t('auth.logout')}
          </button>
        </nav>
      </aside>

      {navOpen && (
        <div
          className="ad-side-backdrop is-open"
          onClick={closeNav}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="ad-main">
        {/* Top bar */}
        <div className="ad-top">
          <button
            type="button"
            className="ad-mobile-toggle"
            aria-label={t('nav.openNavigation')}
            onClick={() => setNavOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
          <div className="crumbs">
            <Link to="/admin">{t('adminDashboard.breadcrumbAdmin')}</Link>
            {isSubRoute && (
              <>
                {' / '}
                <span className="here">{getCurrentPageLabel()}</span>
              </>
            )}
          </div>

          <AdminSearchBox ref={searchInputRef} placeholder={getSearchPlaceholder()} />

          <div className="right">
            <span className="pill ok">
              <span className="dot"></span>
              {t('adminDashboard.systemNominal')}
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
            <Route path="/qr" element={<QRGenerator />} />
            <Route path="/banners" element={<BannerManagement />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
