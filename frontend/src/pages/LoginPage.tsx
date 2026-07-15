import React, { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import './LoginPage.css';

const REMEMBER_EMAIL_KEY = 'loginRememberEmail';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, loading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(true);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const checkOAuthStatus = async () => {
      try {
        const status = await authApi.getOAuthStatus();
        setGoogleEnabled(status.googleEnabled);
      } catch (err) {
        console.error('Failed to check OAuth status:', err);
        setGoogleEnabled(false);
      } finally {
        setOauthLoading(false);
      }
    };

    checkOAuthStatus();

    const oauthError = searchParams.get('error');
    if (oauthError) {
      let errorMessage = t('auth.oauthError', 'Authentication failed');

      switch (oauthError) {
        case 'oauth_failed':
          errorMessage = t('auth.oauthFailed', 'Google authentication failed. Please try again.');
          break;
        case 'account_deactivated':
          errorMessage = t('auth.accountDeactivated', 'Your account has been deactivated.');
          break;
        default:
          errorMessage = decodeURIComponent(oauthError);
      }

      setFormError(errorMessage);
    }
  }, [searchParams, t]);

  const navigateAfterLogin = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.mustChangePassword) {
        navigate('/change-password');
      } else if (from && from !== '/') {
        if (user.role === 'admin') {
          navigate(from);
        } else if (user.role === 'vendor' && from.startsWith('/vendor')) {
          navigate(from);
        } else if (from.startsWith('/invite') || from.startsWith('/map')) {
          navigate(from);
        } else {
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
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email.trim() || !password.trim()) {
      setFormError(t('errors.required'));
      return;
    }

    try {
      await login(email, password);

      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      navigateAfterLogin();
    } catch {
      // Error is handled by AuthContext
    }
  };

  const handleGoogleLogin = () => {
    setFormError('');
    clearError();
    window.location.href = authApi.getGoogleOAuthUrl();
  };

  const handleReset = () => {
    setEmail('');
    setPassword('');
    setRememberMe(false);
    setFormError('');
    clearError();
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
  };

  const authSteps = [
    { num: 1, label: t('auth.steps.signIn', 'Sign in'), active: true },
    { num: 2, label: t('auth.steps.chooseRole', 'Choose role') },
    { num: 3, label: t('auth.steps.invite', 'Invite · if any') },
    { num: 4, label: t('auth.steps.newPassword', 'New password') },
  ];

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="auth-stage">
          <div className="auth-rail">
            <div className="auth-progress" aria-label={t('auth.login', 'Sign in')}>
              {authSteps.map((step, index) => (
                <React.Fragment key={step.num}>
                  <div className={`auth-step${step.active ? ' active' : ''}`}>
                    <span className="auth-step-num">{step.num}</span>
                    <span className="auth-step-label">{step.label}</span>
                  </div>
                  {index < authSteps.length - 1 && <span className="auth-bar" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
            <div className="auth-rail-nav">
              <Link to="/" className="login-btn login-btn-ghost login-btn-sm">
                ← {t('auth.back', 'Back')}
              </Link>
              <button type="button" className="login-btn login-btn-primary login-btn-sm" disabled>
                {t('auth.next', 'Next')} →
              </button>
              <button
                type="button"
                className="login-btn login-btn-icon"
                onClick={handleReset}
                title={t('auth.resetForm', 'Clear form')}
                aria-label={t('auth.resetForm', 'Clear form')}
              >
                ↻
              </button>
            </div>
          </div>

          <div className="auth-card active">
            <div className="auth-inner">
              <div className="auth-intro">
                <BrandLogo size="md" glow className="auth-brand-logo" />
                <span className="auth-tag">{t('auth.stepTag', 'step 1 · login')}</span>
                <h1 className="auth-title">
                  {t('auth.welcomeBack', 'Welcome back to')}{' '}
                  <em>{t('common.appName', 'Fair Marketplace')}</em>.
                </h1>
                <p className="auth-sub">
                  {t(
                    'auth.loginSubtitle',
                    'Sign in to see your friends at the fair, save vendors, and apply to host a stand.'
                  )}
                </p>
              </div>

              <div className="auth-form-col">
                <form onSubmit={handleSubmit} className="login-form">
                  {(error || formError) && (
                    <div className="login-form-error" role="alert">
                      {error || formError}
                    </div>
                  )}

                  <div className="login-field">
                    <label htmlFor="email">{t('applications.form.email', 'Email')}</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>

                  <div className="login-field">
                    <label htmlFor="password">{t('auth.password', 'Password')}</label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                  </div>

                  <div className="login-form-row">
                    <label className="login-remember">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={loading}
                      />
                      {t('auth.rememberMe', 'Remember me')}
                    </label>
                    <span className="login-forgot" title={t('auth.forgotSoon', 'Password reset coming soon')}>
                      {t('auth.forgot', 'Forgot?')}
                    </span>
                  </div>

                  <button type="submit" className="login-btn login-btn-accent login-btn-full" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="login-spinner" aria-hidden="true" />
                        {t('common.loading', 'Loading...')}
                      </>
                    ) : (
                      <>{t('auth.signInArrow', 'Sign in →')}</>
                    )}
                  </button>
                </form>

                {!oauthLoading && googleEnabled && (
                  <>
                    <div className="login-or">{t('auth.orContinueWith', 'or continue with')}</div>
                    <div className="login-oauth">
                      <button
                        type="button"
                        className="login-btn login-btn-oauth"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                      >
                        <span className="login-oauth-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="16" height="16">
                            <path
                              d="M12 5c1.85 0 3.5.63 4.8 1.87l3.6-3.6C18.07 1.04 15.27 0 12 0 7.4 0 3.4 2.65 1.4 6.5l4.2 3.27C6.6 7 9.07 5 12 5Z"
                              fill="#ea4335"
                            />
                            <path
                              d="M23.5 12.27c0-.85-.07-1.66-.2-2.45H12v4.65h6.46c-.28 1.5-1.13 2.78-2.4 3.63l3.7 2.87c2.16-2 3.74-4.94 3.74-8.7Z"
                              fill="#4285f4"
                            />
                            <path
                              d="M5.6 14.27c-.27-.8-.43-1.66-.43-2.55s.16-1.75.43-2.55L1.4 5.9C.5 7.7 0 9.78 0 12s.5 4.3 1.4 6.1l4.2-3.27Z"
                              fill="#fbbc04"
                            />
                            <path
                              d="M12 24c3.27 0 6-1.07 8-2.9l-3.7-2.87c-1.04.7-2.4 1.1-4.3 1.1-2.93 0-5.4-2-6.4-4.78L1.4 17.83C3.4 21.45 7.4 24 12 24Z"
                              fill="#34a853"
                            />
                          </svg>
                        </span>
                        {t('auth.continueGoogle', 'Continue with Google')}
                      </button>
                    </div>
                  </>
                )}

                <p className="login-signup">
                  {t('auth.newHere', 'New here?')}{' '}
                  {googleEnabled ? (
                    <button type="button" className="login-signup-link" onClick={handleGoogleLogin} disabled={loading}>
                      {t('auth.createAccount', 'Create account')}
                    </button>
                  ) : (
                    <Link to="/" className="login-signup-link">
                      {t('auth.createAccount', 'Create account')}
                    </Link>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
