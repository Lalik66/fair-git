import React, { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  // Get the redirect path from location state, or default based on role
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email.trim()) {
      setFormError(t('errors.required'));
      return;
    }

    if (!password.trim()) {
      setFormError(t('errors.required'));
      return;
    }

    try {
      await login(email, password);
      // Navigate to the intended destination or dashboard based on role
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // Check if user must change password first
        if (user.mustChangePassword) {
          navigate('/change-password');
        } else if (from && from !== '/') {
          // If there's a specific destination, check if user has access
          if (user.role === 'admin') {
            // Admin can access any route, use the intended destination
            navigate(from);
          } else if (user.role === 'vendor' && from.startsWith('/vendor')) {
            // Vendor can access vendor routes
            navigate(from);
          } else {
            // For other cases, use role-based default
            navigate(user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : '/');
          }
        } else if (user.role === 'admin') {
          navigate('/admin');
        } else if (user.role === 'vendor') {
          navigate('/vendor');
        } else {
          navigate('/');
        }
      } else {
        navigate(from || '/');
      }
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>{t('auth.login')}</h1>
            <p>Fair Marketplace</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {(error || formError) && (
              <div className="form-error-message">
                {error || formError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                {t('applications.form.email')}
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fairmarketplace.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                {t('auth.password')}
              </label>
              <input
                type="password"
                id="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  {t('common.loading')}
                </>
              ) : (
                t('auth.login')
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>
              <a href="/">{t('nav.home')}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
