import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ChangePassword from './pages/ChangePassword';
import VendorBookings from './pages/VendorBookings';
import VendorProfile from './pages/VendorProfile';
import VendorApplications from './pages/VendorApplications';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import MapPage from './pages/MapPage';
import { authApi } from './services/api';

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
    return '/';
  };

  const getProfileUrl = () => {
    if (user?.role === 'admin') return '/admin'; // Admin can update profile in dashboard
    if (user?.role === 'vendor') return '/vendor/profile';
    return '/';
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
        <Link to="/">Fair Marketplace</Link>
      </div>

      {/* Hamburger menu button - visible only on mobile */}
      <button
        className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
        onClick={toggleMobileMenu}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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

// MapPage and AboutPage imported from pages/

const VendorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();

  // Check if we're on a sub-route
  const isOnSubRoute = location.pathname !== '/vendor' && location.pathname !== '/vendor/';

  return (
    <div className="vendor-layout">
      <aside className="vendor-sidebar">
        <div className="vendor-sidebar-header">
          <h2>Vendor Portal</h2>
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>
        <nav className="vendor-nav">
          <Link
            to="/vendor"
            className={`vendor-nav-link ${location.pathname === '/vendor' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            to="/vendor/bookings"
            className={`vendor-nav-link ${location.pathname.includes('/vendor/bookings') ? 'active' : ''}`}
          >
            My Bookings
          </Link>
          <Link
            to="/vendor/applications"
            className={`vendor-nav-link ${location.pathname.includes('/vendor/applications') ? 'active' : ''}`}
          >
            My Applications
          </Link>
          <Link
            to="/vendor/profile"
            className={`vendor-nav-link ${location.pathname.includes('/vendor/profile') ? 'active' : ''}`}
          >
            My Profile
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
      <main className="vendor-main">
        <Routes>
          <Route
            index
            element={
              <div className="vendor-dashboard-home">
                <h1>{t('vendor.dashboard', 'Vendor Dashboard')}</h1>
                <p>Welcome back, {user?.firstName || user?.email}!</p>
                <div className="dashboard-cards">
                  <Link to="/map" className="dashboard-card dashboard-card-primary">
                    <h3>New Application</h3>
                    <p>Browse the map and apply for a vendor house</p>
                  </Link>
                  <Link to="/vendor/bookings" className="dashboard-card">
                    <h3>My Bookings</h3>
                    <p>View your approved fair bookings</p>
                  </Link>
                  <Link to="/vendor/applications" className="dashboard-card">
                    <h3>My Applications</h3>
                    <p>Track your application status</p>
                  </Link>
                  <Link to="/vendor/profile" className="dashboard-card">
                    <h3>My Profile</h3>
                    <p>Update your contact and business info</p>
                  </Link>
                </div>
              </div>
            }
          />
          <Route path="bookings" element={<VendorBookings />} />
          <Route path="applications" element={<VendorApplications />} />
          <Route path="profile" element={<VendorProfile />} />
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
        Go Home
      </Link>
    </div>
  );
};

// Main app content with routes
const AppContent: React.FC = () => {
  return (
    <div className="app">
      <Navigation />
      <main className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Change Password Route - Protected but accessible when mustChangePassword is true */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute allowMustChangePassword>
                <ChangePassword />
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
