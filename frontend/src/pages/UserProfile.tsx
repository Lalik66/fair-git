import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './UserProfile.css';

const UserProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // The CTA no longer instantly upgrades the role. The user stays a `user`,
  // fills in the application form, and only becomes a `vendor` once an admin
  // approves it. Send them straight to their Applications tab.
  const handleBecomeVendor = () => {
    navigate('/applications');
  };

  if (!user) {
    return (
      <div className="user-profile-container">
        <div className="loading-spinner">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="user-profile-card">
        <div className="user-profile-header">
          <div className="user-avatar-large">
            {user.firstName && user.lastName
              ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
              : user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-header-info">
            <h1>{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}</h1>
            <span className="user-role-badge">{t('auth.roleVisitor', 'Visitor')}</span>
          </div>
        </div>

        <div className="user-profile-section">
          <h2>{t('user.accountInfo', 'Account Information')}</h2>
          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="info-label">{t('user.email', 'Email')}</span>
              <span className="info-value">{user.email}</span>
            </div>
            {user.firstName && (
              <div className="profile-info-item">
                <span className="info-label">{t('user.firstName', 'First Name')}</span>
                <span className="info-value">{user.firstName}</span>
              </div>
            )}
            {user.lastName && (
              <div className="profile-info-item">
                <span className="info-label">{t('user.lastName', 'Last Name')}</span>
                <span className="info-value">{user.lastName}</span>
              </div>
            )}
            <div className="profile-info-item">
              <span className="info-label">{t('user.role', 'Role')}</span>
              <span className="info-value">{t('auth.roleVisitor', 'Visitor')}</span>
            </div>
          </div>
        </div>

        <div className="user-profile-section become-vendor-section">
          <h2>{t('user.becomeVendor', 'Become a Vendor')}</h2>
          <p className="section-description">
            {t('user.becomeVendorDescription', 'Upgrade your account to a vendor account to apply for vendor spaces at fairs, manage your business profile, and participate in upcoming events.')}
          </p>
          <div className="vendor-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">🏪</span>
              <span>{t('user.benefit1', 'Apply for vendor spaces')}</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📊</span>
              <span>{t('user.benefit2', 'Manage your business profile')}</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🎪</span>
              <span>{t('user.benefit3', 'Participate in fair events')}</span>
            </div>
          </div>
          <button
            className="btn btn-primary btn-become-vendor"
            onClick={handleBecomeVendor}
          >
            {t('vendor.apply', 'Become a vendor')}
          </button>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '0.75rem' }}
            onClick={() => navigate('/applications')}
          >
            {t('vendor.myApplications', 'My Applications')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
