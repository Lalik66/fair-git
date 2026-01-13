import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import UserManagement from './UserManagement';
import AdminLogs from './AdminLogs';
import FairManagement from './FairManagement';
import ApplicationReview from './ApplicationReview';
import './AdminDashboard.css';

// Admin home/overview component
const AdminHome: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <div className="admin-welcome">
        <h2>{t('welcome.title', { defaultValue: 'Welcome!' })}</h2>
        <p>
          {t('You are logged in as an administrator.', {
            defaultValue: 'You are logged in as an administrator.',
          })}
        </p>
      </div>

      <div className="admin-cards">
        <div className="admin-card">
          <h3>{t('admin.fairManagement')}</h3>
          <p>Manage fairs, schedules, and events.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/fairs')}
          >
            {t('Manage Fairs', { defaultValue: 'Manage Fairs' })}
          </button>
        </div>

        <div className="admin-card">
          <h3>{t('admin.applicationReview')}</h3>
          <p>Review and approve vendor applications.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/applications')}
          >
            {t('Review Applications', { defaultValue: 'Review Applications' })}
          </button>
        </div>

        <div className="admin-card">
          <h3>{t('admin.mapManagement')}</h3>
          <p>Configure vendor houses and facilities.</p>
          <button className="btn btn-primary" disabled>
            Coming Soon
          </button>
        </div>

        <div className="admin-card">
          <h3>{t('admin.userManagement')}</h3>
          <p>Manage users and admin accounts.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/users')}
          >
            {t('Manage Users', { defaultValue: 'Manage Users' })}
          </button>
        </div>

        <div className="admin-card">
          <h3>{t('admin.activityLogs', { defaultValue: 'Activity Logs' })}</h3>
          <p>View admin activity history and audit trail.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/logs')}
          >
            {t('View Logs', { defaultValue: 'View Logs' })}
          </button>
        </div>
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

  // Check if we're on a sub-route
  const isSubRoute = location.pathname !== '/admin' && location.pathname !== '/admin/';

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-left">
            <h1>{t('admin.dashboard')}</h1>
            {isSubRoute && (
              <Link to="/admin" className="back-link">
                &larr; {t('Back to Dashboard', { defaultValue: 'Back to Dashboard' })}
              </Link>
            )}
          </div>
          <div className="admin-user-info">
            <span className="admin-user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="admin-user-email">{user?.email}</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/logs" element={<AdminLogs />} />
          <Route path="/fairs" element={<FairManagement />} />
          <Route path="/applications" element={<ApplicationReview />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
