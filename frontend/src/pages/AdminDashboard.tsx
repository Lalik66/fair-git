import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import UserManagement from './UserManagement';
import AdminLogs from './AdminLogs';
import FairManagement from './FairManagement';
import ApplicationReview from './ApplicationReview';
import AboutUsEditor from './AboutUsEditor';
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

        <div className="admin-card">
          <h3>{t('admin.aboutUs', { defaultValue: 'About Us Page' })}</h3>
          <p>Edit the About Us page content.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/about-us')}
          >
            {t('Edit Content', { defaultValue: 'Edit Content' })}
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

  // Build breadcrumb items from current path
  const getBreadcrumbs = () => {
    const routeLabels: Record<string, string> = {
      'fairs': t('admin.fairManagement', { defaultValue: 'Fair Management' }),
      'applications': t('admin.applicationReview', { defaultValue: 'Application Review' }),
      'users': t('admin.userManagement', { defaultValue: 'User Management' }),
      'logs': t('admin.adminLogs', { defaultValue: 'Activity Logs' }),
      'about-us': t('admin.aboutUsEditor', { defaultValue: 'About Us Editor' }),
    };

    const crumbs: Array<{ label: string; path: string | null }> = [
      { label: t('admin.dashboard', { defaultValue: 'Dashboard' }), path: '/admin' },
    ];

    if (isSubRoute) {
      // Extract the sub-route segment after /admin/
      const subPath = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
      if (subPath && routeLabels[subPath]) {
        crumbs.push({ label: routeLabels[subPath], path: null }); // last item is current page, no link
      }
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-left">
            <h1>{t('admin.dashboard')}</h1>
            {isSubRoute && (
              <nav className="breadcrumb" aria-label="Breadcrumb">
                <ol className="breadcrumb-list">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={index} className={`breadcrumb-item ${crumb.path === null ? 'breadcrumb-active' : ''}`}>
                      {index > 0 && <span className="breadcrumb-separator">&rsaquo;</span>}
                      {crumb.path ? (
                        <Link to={crumb.path} className="breadcrumb-link">{crumb.label}</Link>
                      ) : (
                        <span className="breadcrumb-current">{crumb.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
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
          <Route path="/about-us" element={<AboutUsEditor />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
