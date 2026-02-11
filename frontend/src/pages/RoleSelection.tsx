import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import './RoleSelection.css';

/**
 * RoleSelection Page
 *
 * Displayed to first-time OAuth users to let them choose their role.
 * Feature 3: Google OAuth sign-in for visitors
 * Feature 221: First-time user onboarding via OAuth
 */
const RoleSelection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'user' | 'vendor' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelect = (role: 'user' | 'vendor') => {
    setSelectedRole(role);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedRole) {
      setError(t('auth.selectRoleRequired', 'Please select a role to continue'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await authApi.selectRole(selectedRole);

      // Update user in context and localStorage
      const updatedUser = response.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Navigate based on selected role
      if (selectedRole === 'vendor') {
        navigate('/vendor');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Error selecting role:', err);
      setError(err.response?.data?.error || t('errors.serverError', 'Something went wrong'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="role-selection-page">
      <div className="role-selection-container">
        <div className="role-selection-card">
          <div className="role-selection-header">
            <h1>{t('auth.selectRole', 'Select Your Role')}</h1>
            <p className="welcome-text">
              {t('auth.welcomeNewUser', 'Welcome to Fair Marketplace!')}
            </p>
            {user?.email && (
              <p className="user-email">{user.email}</p>
            )}
          </div>

          {error && (
            <div className="role-selection-error">
              {error}
            </div>
          )}

          <div className="role-options">
            <button
              className={`role-option ${selectedRole === 'user' ? 'selected' : ''}`}
              onClick={() => handleRoleSelect('user')}
              disabled={submitting}
            >
              <div className="role-icon visitor-icon">
                <span role="img" aria-label="visitor">👤</span>
              </div>
              <div className="role-info">
                <h3>{t('auth.roleVisitor', 'Visitor')}</h3>
                <p>{t('auth.roleDescription.visitor', 'Browse fairs and explore vendors')}</p>
              </div>
              <div className="role-checkmark">
                {selectedRole === 'user' && <span>✓</span>}
              </div>
            </button>

            <button
              className={`role-option ${selectedRole === 'vendor' ? 'selected' : ''}`}
              onClick={() => handleRoleSelect('vendor')}
              disabled={submitting}
            >
              <div className="role-icon vendor-icon">
                <span role="img" aria-label="vendor">🏪</span>
              </div>
              <div className="role-info">
                <h3>{t('auth.roleVendor', 'Vendor')}</h3>
                <p>{t('auth.roleDescription.vendor', 'Apply for vendor spaces and manage your business')}</p>
              </div>
              <div className="role-checkmark">
                {selectedRole === 'vendor' && <span>✓</span>}
              </div>
            </button>
          </div>

          <button
            className="btn btn-primary btn-continue"
            onClick={handleSubmit}
            disabled={!selectedRole || submitting}
          >
            {submitting ? t('common.loading', 'Loading...') : t('common.continue', 'Continue')}
          </button>

          <p className="role-note">
            {t('auth.roleNote', 'You can change your role later from your profile settings.')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
