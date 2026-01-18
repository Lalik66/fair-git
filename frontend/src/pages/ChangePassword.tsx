import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import './ChangePassword.css';

const ChangePassword: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (newPassword.length < 8) {
      setError(t('Password must be at least 8 characters', { defaultValue: 'Password must be at least 8 characters' }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('Passwords do not match', { defaultValue: 'Passwords do not match' }));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t('New password must be different from current password', { defaultValue: 'New password must be different from current password' }));
      return;
    }

    setLoading(true);

    try {
      await authApi.changePassword(currentPassword, newPassword);

      // Update user in local storage to reflect mustChangePassword = false
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const updatedUser = JSON.parse(userStr);
        updatedUser.mustChangePassword = false;
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // Redirect to appropriate dashboard
      if (user?.role === 'admin') {
        navigate('/admin');
      } else if (user?.role === 'vendor') {
        navigate('/vendor');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('Failed to change password', { defaultValue: 'Failed to change password' }));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="change-password-page">
      <div className="change-password-container">
        <div className="change-password-card">
          <div className="change-password-header">
            <h1>{t('Change Password', { defaultValue: 'Change Password' })}</h1>
            <p className="required-notice">
              {t('You must change your password before continuing.', {
                defaultValue: 'You must change your password before continuing.',
              })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="change-password-form">
            {error && <div className="form-error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="currentPassword" className="form-label">
                {t('Current Password', { defaultValue: 'Current Password' })}
              </label>
              <input
                type="password"
                id="currentPassword"
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('Enter your temporary password', { defaultValue: 'Enter your temporary password' })}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">
                {t('New Password', { defaultValue: 'New Password' })}
              </label>
              <input
                type="password"
                id="newPassword"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('At least 8 characters', { defaultValue: 'At least 8 characters' })}
                required
                disabled={loading}
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                {t('Confirm New Password', { defaultValue: 'Confirm New Password' })}
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('Confirm your new password', { defaultValue: 'Confirm your new password' })}
                required
                disabled={loading}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLogout}
                disabled={loading}
              >
                {t('auth.logout')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {t('common.loading')}
                  </>
                ) : (
                  t('Change Password', { defaultValue: 'Change Password' })
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
