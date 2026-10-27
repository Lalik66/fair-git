import React, { useState, FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import './LoginPage.css';

// "Forgot password" — asks the backend to email a reset link. The backend
// answers the same way whether or not the email exists, so the success
// message is deliberately conditional ("if an account exists…").
const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const prefill = (location.state as { email?: string } | null)?.email || '';

  const [email, setEmail] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('auth.emailRequired', 'Please enter your email.'));
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(trimmed);
      setSent(true);
    } catch (err: unknown) {
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(apiError || t('auth.genericError', 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

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
                <h1 className="auth-title">{t('auth.forgotTitle', 'Forgot your password?')}</h1>
                <p className="auth-sub">
                  {t(
                    'auth.forgotSubtitle',
                    "Enter your account email and we'll send you a link to set a new password."
                  )}
                </p>
              </div>

              <div className="auth-form-col">
                {sent ? (
                  <div className="login-form">
                    <div className="login-form-success" role="status">
                      {t(
                        'auth.resetLinkSent',
                        'If an account exists for this email, we have sent a password reset link. Check your inbox and spam folder — the link is valid for 60 minutes.'
                      )}
                    </div>
                    <Link to="/login" className="login-btn login-btn-accent login-btn-full">
                      {t('auth.backToLogin', 'Back to sign in')} →
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="login-form" noValidate>
                    {error && (
                      <div className="login-form-error" role="alert">
                        {error}
                      </div>
                    )}

                    <div className="login-field">
                      <label htmlFor="forgot-email">{t('applications.form.email', 'Email')}</label>
                      <input
                        type="email"
                        id="forgot-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        autoFocus
                        disabled={loading}
                      />
                    </div>

                    <button type="submit" className="login-btn login-btn-accent login-btn-full" disabled={loading}>
                      {loading ? (
                        <span className="login-spinner" aria-hidden="true" />
                      ) : (
                        <>{t('auth.sendResetLink', 'Send reset link')} →</>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
