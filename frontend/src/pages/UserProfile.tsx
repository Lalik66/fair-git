import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import './UserProfile.css';

const UserProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleBecomeVendor = () => {
    setShowConfirmDialog(true);
  };

  const confirmUpgrade = async () => {
    setShowConfirmDialog(false);
    setUpgrading(true);
    setError(null);

    try {
      const response = await authApi.upgradeToVendor();

      // Update user in context and localStorage
      const updatedUser = response.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Navigate to vendor dashboard
      navigate('/vendor');
    } catch (err: any) {
      console.error('Error upgrading to vendor:', err);
      setError(err.response?.data?.error || t('user.upgradeError', 'Failed to upgrade to vendor. Please try again.'));
    } finally {
      setUpgrading(false);
    }
  };

  const cancelUpgrade = () => {
    setShowConfirmDialog(false);
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

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

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
            disabled={upgrading}
          >
            {upgrading ? t('common.loading') : t('user.becomeVendorButton', 'Become a Vendor')}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <h3>{t('user.confirmUpgrade', 'Confirm Account Upgrade')}</h3>
            <p>
              {t('user.confirmUpgradeMessage', 'Are you sure you want to upgrade your account to a vendor account? This will give you access to the vendor dashboard where you can manage your business and apply for fair spaces.')}
            </p>
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={cancelUpgrade}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmUpgrade}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
