import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import OAuthCallback from './pages/OAuthCallback';
import RoleSelection from './pages/RoleSelection';
import AdminDashboard from './pages/AdminDashboard';
import ChangePassword from './pages/ChangePassword';
import VendorBookings from './pages/VendorBookings';
import VendorProfile from './pages/VendorProfile';
import VendorApplications from './pages/VendorApplications';
import VendorReviews from './pages/VendorReviews';
import ApplicantApplications from './pages/ApplicantApplications';
import VendorApplicationForm from './pages/VendorApplicationForm';
import HomePage from './pages/HomePage';
import FairDetail from './pages/FairDetail';
import AboutPage from './pages/AboutPage';
import InvitePage from './pages/InvitePage';
import { SplitViewMapLayout } from './components/map';
import UserProfile from './pages/UserProfile';
import SchedulePage from './pages/SchedulePage';
import { authApi } from './services/api';
import BrandLogo from './components/BrandLogo';
import SosButton from './components/SosButton';
import Footer from './components/Footer';

// Navigation component
const Navigation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu and user menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu and user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (mobileMenuOpen && !target.closest('.main-nav')) {
        setMobileMenuOpen(false);
      }
      if (userMenuOpen && !target.closest('.user-menu')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen, userMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'az' ? 'en' : 'az';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);

    // If user is logged in, also save to database
    if (user) {
      try {
        await authApi.updateLanguage(newLang);
      } catch (error) {
        console.error('Failed to save language preference to server:', error);
      }
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleUserMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUserMenuOpen(!userMenuOpen);
  };

  const handleNavLinkClick = () => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  const getDashboardUrl = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'vendor') return '/vendor';
    return '/profile'; // Regular users go to their profile
  };

  const getProfileUrl = () => {
    if (user?.role === 'admin') return '/admin'; // Admin can update profile in dashboard
    if (user?.role === 'vendor') return '/vendor/profile';
    return '/profile/account'; // Regular users: profile tab of their dashboard
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <nav className="main-nav">
      <div className="nav-brand">
        <Link to="/" className="nav-brand-link" aria-label="Fair Marketplace">
          <BrandLogo size="sm" glow alt="" />
          <span className="nav-brand-text">Fair Marketplace</span>
        </Link>
      </div>

      {/* Hamburger menu button - visible only on mobile */}
      <button
        className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
        onClick={toggleMobileMenu}
        aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
        aria-expanded={mobileMenuOpen}
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Overlay for mobile menu */}
      <div
        className={`nav-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      {/* Navigation links */}
      <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={handleNavLinkClick}>{t('nav.home')}</Link>
        <Link to="/map" onClick={handleNavLinkClick}>{t('nav.browseMap')}</Link>
        <Link to="/schedule" onClick={handleNavLinkClick}>{t('nav.schedule', 'Schedule')}</Link>
        <Link to="/about" onClick={handleNavLinkClick}>{t('nav.aboutUs')}</Link>
        <button onClick={toggleLanguage} className="btn-language">
          {i18n.language === 'az' ? 'EN' : 'AZ'}
        </button>
        {user ? (
          <div className="user-menu">
            <button
              className="user-menu-trigger"
              onClick={toggleUserMenu}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <span className="user-avatar">{getUserInitials()}</span>
              <span className="user-name">{user.firstName || user.email?.split('@')[0]}</span>
              <span className={`user-menu-arrow ${userMenuOpen ? 'open' : ''}`}>▼</span>
            </button>
            {userMenuOpen && (
              <div className="user-menu-dropdown">
                <Link
                  to={getDashboardUrl()}
                  className="user-menu-item"
                  onClick={handleNavLinkClick}
                >
                  <span className="user-menu-icon">🏠</span>
                  {t('nav.dashboard')}
                </Link>
                <Link
                  to={getProfileUrl()}
                  className="user-menu-item"
                  onClick={handleNavLinkClick}
                >
                  <span className="user-menu-icon">👤</span>
                  {t('nav.profile', 'Profile')}
                </Link>
                <button
                  onClick={() => { logout(); handleNavLinkClick(); }}
                  className="user-menu-item user-menu-logout"
                >
                  <span className="user-menu-icon">🚪</span>
                  {t('auth.logout')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary btn-nav" onClick={handleNavLinkClick}>
            {t('auth.login')}
          </Link>
        )}
      </div>
    </nav>
  );
};

const VendorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);

  return (
    <div className="vendor-layout">
      <aside className={`vendor-sidebar${navOpen ? ' is-open' : ''}`}>
        <div className="vendor-sidebar-header">
          <h2>{t('vendor.portal')}</h2>
          <Link to="/" className="back-link" onClick={closeNav}>← {t('vendor.backToHome')}</Link>
        </div>
        <nav className="vendor-nav">
          <Link
            to="/vendor"
            onClick={closeNav}
            className={`vendor-nav-link ${location.pathname === '/vendor' ? 'active' : ''}`}
          >
            {t('nav.dashboard')}
          </Link>
          <Link
            to="/vendor/bookings"
            onClick={closeNav}
            className={`vendor-nav-link ${location.pathname.includes('/vendor/bookings') ? 'active' : ''}`}
          >
            {t('vendor.myBookings')}
          </Link>
          <Link
            to="/vendor/applications"
            onClick={closeNav}
            className={`vendor-nav-link ${location.pathname.includes('/vendor/applications') ? 'active' : ''}`}
          >
            {t('vendor.myApplications')}
          </Link>
          <Link
            to="/vendor/reviews"
            onClick={closeNav}
            className={`vendor-nav-link ${location.pathname.includes('/vendor/reviews') ? 'active' : ''}`}
          >
            {t('reviews.vendorPageTitle')}
          </Link>
          <Link
            to="/vendor/profile"
            onClick={closeNav}
            className={`vendor-nav-link ${location.pathname.includes('/vendor/profile') ? 'active' : ''}`}
          >
            {t('vendor.myProfile')}
          </Link>
        </nav>
        <div className="vendor-sidebar-footer">
          <div className="vendor-user-info">
            <div className="vendor-user-name">{user?.firstName} {user?.lastName}</div>
            <div className="vendor-user-email">{user?.email}</div>
          </div>
          <button onClick={() => logout()} className="btn btn-secondary btn-logout">
            {t('auth.logout')}
          </button>
        </div>
      </aside>
      {navOpen && (
        <div
          className="vendor-sidebar-backdrop is-open"
          onClick={closeNav}
          aria-hidden="true"
        />
      )}
      <main className="vendor-main">
        <div className="vendor-mobile-bar">
          <button
            type="button"
            className="vendor-nav-toggle"
            aria-label={t('nav.openNavigation')}
            onClick={() => setNavOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
          <span className="brand">{t('vendor.portal')}</span>
        </div>
        <Routes>
          <Route
            index
            element={
              <div className="vendor-dashboard-home">
                <p className="eyebrow">{t('vendor.portal')}</p>
                <h1>{t('vendor.dashboard', 'Vendor Dashboard')}</h1>
                <p>Welcome back, {user?.firstName || user?.email}!</p>
                <div className="dashboard-cards">
                  <Link to="/applications/new" className="dashboard-card dashboard-card-primary">
                    <h3>{t('vendor.newApplication', 'New Application')}</h3>
                    <p>{t('vendor.applyHint', 'Fill in the application form to apply for a vendor house')}</p>
                  </Link>
                  <Link to="/vendor/bookings" className="dashboard-card">
                    <h3>{t('vendor.myBookings')}</h3>
                    <p>{t('vendor.bookingsDesc')}</p>
                  </Link>
                  <Link to="/vendor/applications" className="dashboard-card">
                    <h3>{t('vendor.myApplications')}</h3>
                    <p>{t('application.trackStatus')}</p>
                  </Link>
                  <Link to="/vendor/profile" className="dashboard-card">
                    <h3>{t('vendor.myProfile')}</h3>
                    <p>{t('vendor.profileDesc')}</p>
                  </Link>
                </div>
              </div>
            }
          />
          <Route path="bookings" element={<VendorBookings />} />
          <Route path="applications" element={<VendorApplications />} />
          <Route path="reviews" element={<VendorReviews />} />
          <Route path="profile" element={<VendorProfile />} />
        </Routes>
      </main>
    </div>
  );
};

// Regular-user portal. Mirrors VendorDashboard so an applicant gets the
// same left-sidebar layout: Dashboard / My Applications / Profile. The top
// nav dropdown stays a flat 3 items (Dashboard, Profile, Logout) — the
// applications view lives only as a sidebar tab here, never in the dropdown.
const UserDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);

  return (
    <div className="vendor-layout">
      <aside className={`vendor-sidebar${navOpen ? ' is-open' : ''}`}>
        <div className="vendor-sidebar-header">
          <h2>{t('nav.dashboard', 'Dashboard')}</h2>
          <Link to="/" className="back-link" onClick={closeNav}>← {t('nav.home', 'Home')}</Link>
        </div>
        <nav className="vendor-nav">
          <Link
            to="/profile"
            onClick={closeNav}
            className={`vendor-nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
          >
            {t('nav.dashboard', 'Dashboard')}
          </Link>
          <Link
            to="/profile/applications"
            onClick={closeNav}
            className={`vendor-nav-link ${location.pathname.includes('/profile/applications') ? 'active' : ''}`}
          >
            {t('vendor.myApplications', 'My Applications')}
          </Link>
          <Link
            to="/profile/account"
            onClick={closeNav}
            className={`vendor-nav-link ${location.pathname.includes('/profile/account') ? 'active' : ''}`}
          >
            {t('nav.profile', 'Profile')}
          </Link>
        </nav>
        <div className="vendor-sidebar-footer">
          <div className="vendor-user-info">
            <div className="vendor-user-name">{user?.firstName} {user?.lastName}</div>
            <div className="vendor-user-email">{user?.email}</div>
          </div>
          <button onClick={() => logout()} className="btn btn-secondary btn-logout">
            {t('auth.logout')}
          </button>
        </div>
      </aside>
      {navOpen && (
        <div
          className="vendor-sidebar-backdrop is-open"
          onClick={closeNav}
          aria-hidden="true"
        />
      )}
      <main className="vendor-main">
        <div className="vendor-mobile-bar">
          <button
            type="button"
            className="vendor-nav-toggle"
            aria-label={t('nav.openNavigation')}
            onClick={() => setNavOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
          <span className="brand">{t('nav.dashboard', 'Dashboard')}</span>
        </div>
        <Routes>
          <Route
            index
            element={
              <div className="vendor-dashboard-home">
                <h1>{t('nav.dashboard', 'Dashboard')}</h1>
                <p>Welcome back, {user?.firstName || user?.email}!</p>
                <div className="dashboard-cards">
                  <Link to="/applications/new" className="dashboard-card dashboard-card-primary">
                    <h3>{t('vendor.newApplication', 'New Application')}</h3>
                    <p>{t('vendor.applyHint', 'Fill in the application form to apply for a vendor house')}</p>
                  </Link>
                  <Link to="/profile/applications" className="dashboard-card">
                    <h3>{t('vendor.myApplications', 'My Applications')}</h3>
                    <p>{t('application.trackStatus', 'Track your application status')}</p>
                  </Link>
                  <Link to="/profile/account" className="dashboard-card">
                    <h3>{t('nav.profile', 'Profile')}</h3>
                    <p>{t('user.accountInfo', 'Account Information')}</p>
                  </Link>
                </div>
              </div>
            }
          />
          <Route path="applications" element={<ApplicantApplications />} />
          <Route path="account" element={<UserProfile />} />
        </Routes>
      </main>
    </div>
  );
};

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="not-found-page">
      <h1>404</h1>
      <p>{t('errors.notFound', 'Page not found')}</p>
      <Link to="/" className="btn btn-primary">
        {t('nav.goHome')}
      </Link>
    </div>
  );
};

// Main app content with routes
const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthShell = location.pathname === '/login' || location.pathname === '/oauth-callback';

  // Footer shows on public content pages only. Excluded on: the map (its
  // split-view fills the viewport — same reason the request calls it out), the
  // auth shell (chrome-less, like Navigation), and the admin/vendor/profile
  // portals (their own full-height shells already carry a footer). Mirrors the
  // isAuthShell gating used for Navigation above.
  const isMapRoute = location.pathname === '/map';
  const isPortalRoute =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/vendor') ||
    location.pathname.startsWith('/profile');
  const showFooter = !isAuthShell && !isMapRoute && !isPortalRoute;

  return (
    <div className={`app${isAuthShell ? ' app-auth' : ''}`}>
      {!isAuthShell && <Navigation />}
      <main className={`main-content${isAuthShell ? ' main-content-auth' : ''}`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<SplitViewMapLayout />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/fairs/:id" element={<FairDetail />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/invite/:token" element={<InvitePage />} />

          {/* Role Selection Route - For first-time OAuth users (Feature 3 & 221).
              exactRole="user" keeps admins/vendors from landing on a page the
              backend would reject with a confusing 400. */}
          <Route
            path="/select-role"
            element={
              <ProtectedRoute exactRole="user">
                <RoleSelection />
              </ProtectedRoute>
            }
          />

          {/* Change Password Route - Protected but accessible when mustChangePassword is true */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute allowMustChangePassword>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {/* Regular-user portal (sidebar layout, mirrors /vendor/*).
              /profile = dashboard home, /profile/applications = My
              Applications tab, /profile/account = Profile tab.
              requiredRole="user" admits user/vendor/admin. */}
          <Route
            path="/profile/*"
            element={
              <ProtectedRoute requiredRole="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* Shared full-page application form (used by both portals). */}
          <Route
            path="/applications/new"
            element={
              <ProtectedRoute requiredRole="user">
                <VendorApplicationForm />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes - Protected */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Vendor Routes - Protected */}
          <Route
            path="/vendor/*"
            element={
              <ProtectedRoute requiredRole="vendor">
                <VendorDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {showFooter && <Footer />}
      {/* Emergency SOS — visitor-facing pages only; the admin/vendor portals
          and the auth shell don't need a panic button. */}
      {!isAuthShell && !isPortalRoute && <SosButton />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
