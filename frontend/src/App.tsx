import React from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ChangePassword from './pages/ChangePassword';

// Navigation component
const Navigation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'az' ? 'en' : 'az';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <nav className="main-nav">
      <div className="nav-brand">
        <Link to="/">Fair Marketplace</Link>
      </div>
      <div className="nav-links">
        <Link to="/">{t('nav.home')}</Link>
        <Link to="/map">{t('nav.browseMap')}</Link>
        <Link to="/about">{t('nav.aboutUs')}</Link>
        <button onClick={toggleLanguage} className="btn-language">
          {i18n.language === 'az' ? 'EN' : 'AZ'}
        </button>
        {user ? (
          <>
            <Link to={user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : '/'}>
              {t('nav.dashboard')}
            </Link>
            <button onClick={() => logout()} className="btn btn-secondary btn-nav">
              {t('auth.logout')}
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary btn-nav">
            {t('auth.login')}
          </Link>
        )}
      </div>
    </nav>
  );
};

// Placeholder components - to be implemented
const HomePage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="home-page">
      <h1>{t('welcome.title', 'Welcome to Fair Marketplace')}</h1>
      <p>{t('welcome.subtitle', 'Discover amazing fairs and vendors')}</p>
      <div className="home-actions">
        <Link to="/map" className="btn btn-primary">
          {t('welcome.cta.browseMap')}
        </Link>
        <Link to="/login" className="btn btn-outline">
          {t('welcome.cta.applyVendor')}
        </Link>
      </div>
    </div>
  );
};

const MapPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="map-page">
      <h1>{t('map.title', 'Browse Map')}</h1>
      <p>Interactive map will be implemented here.</p>
    </div>
  );
};

const AboutPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="about-page">
      <h1>{t('about.title', 'About Us')}</h1>
      <p>About page content will be implemented here.</p>
    </div>
  );
};

const VendorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="vendor-dashboard">
      <h1>{t('vendor.dashboard', 'Vendor Dashboard')}</h1>
      <p>Welcome, {user?.firstName || user?.email}!</p>
      <button onClick={() => logout()} className="btn btn-secondary">
        {t('auth.logout')}
      </button>
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
