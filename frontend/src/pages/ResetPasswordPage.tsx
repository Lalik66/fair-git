import React, { useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import './LoginPage.css';

// Landing page for the link in the reset email: /reset-password?token=...
// Sets a new password; the token is checked (and becomes unusable) server-side.
const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [linkInvalid, setLinkInvalid] = useState(!token);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('auth.passwordTooShort', 'Password must be at least 8 characters.'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordsDontMatch', 'Passwords do not match.'));
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string } } })?.response?.data;
      if (data?.error === 'INVALID_RESET_TOKEN') {
        setLinkInvalid(true);
      } else {
        setError(data?.error || t('auth.genericError', 'Something went wrong. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  let body: React.ReactNode;
  if (done) {
    body = (
      <div className="login-form">
        <div className="login-form-success" role="status">
          {t('auth.resetSuccess', 'Your password has been changed. You can now sign in with the new password.')}
        </div>
        <Link to="/login" className="login-btn login-btn-accent login-btn-full">
          {t('auth.backToLogin', 'Back to sign in')} →
        </Link>
      </div>
    );
  } else if (linkInvalid) {
    body = (
      <div className="login-form">
        <div className="login-form-error" role="alert">
          {t('auth.resetLinkInvalid', 'This reset link is invalid or has expired. Please request a new one.')}
        </div>
        <Link to="/forgot-password" className="login-btn login-btn-accent login-btn-full">
          {t('auth.requestNewLink', 'Request a new link')} →
        </Link>
      </div>
    );
  } else {
    body = (
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        {error && (
          <div className="login-form-error" role="alert">
            {error}
          </div>
        )}

        <div className="login-field">
          <label htmlFor="new-password">{t('auth.newPassword', 'New password')}</label>
          <input
            type="password"
            id="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            disabled={loading}
          />
        </div>

        <div className="login-field">
          <label htmlFor="confirm-password">{t('auth.confirmNewPassword', 'Repeat new password')}</label>
          <input
            type="password"
            id="confirm-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <button type="submit" className="login-btn login-btn-accent login-btn-full" disabled={loading}>
          {loading ? (
            <span className="login-spinner" aria-hidden="true" />
          ) : (
            <>{t('auth.saveNewPassword', 'Save new password')} →</>
          )}
        </button>
      </form>
    );
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="auth-stage">
          <div className="auth-rail">
            <div className="auth-rail-nav">
              <Link to="/login" className="login-btn login-btn-ghost login-btn-sm">
                ← {t('auth.backToLogin', 'Back to sign in')}
              </Link>
            </div>
          </div>

          <div className="auth-card active">
            <div className="auth-inner">
              <div className="auth-intro">
                <BrandLogo size="md" glow className="auth-brand-logo" />
                <span className="auth-tag">{t('auth.forgotTag', 'password reset')}</span>
                <h1 className="auth-title">{t('auth.resetTitle', 'Set a new password')}</h1>
                <p className="auth-sub">
                  {t(
                    'auth.resetSubtitle',
                    'Choose a new password for your account. It must be at least 8 characters.'
                  )}
                </p>
              </div>

              <div className="auth-form-col">{body}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
