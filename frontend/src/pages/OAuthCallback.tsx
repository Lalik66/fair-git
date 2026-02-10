import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import './OAuthCallback.css';

/**
 * OAuthCallback Page
 *
 * Handles the redirect from Google OAuth after successful authentication.
 * Receives the JWT token as a URL parameter and completes the login process.
 *
 * URL format: /oauth-callback?token=<jwt_token>
 */
const OAuthCallback: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');

      // Handle OAuth errors from backend
      if (errorParam) {
        let errorMessage = t('auth.oauthError', 'Authentication failed');

        // Map common error codes to user-friendly messages
        switch (errorParam) {
          case 'oauth_failed':
            errorMessage = t('auth.oauthFailed', 'Google authentication failed. Please try again.');
            break;
          case 'account_deactivated':
            errorMessage = t('auth.accountDeactivated', 'Your account has been deactivated.');
            break;
          default:
            // Use the error message from the backend if provided
            errorMessage = decodeURIComponent(errorParam);
        }

        setError(errorMessage);
        // Redirect to login after showing error
        setTimeout(() => {
          navigate('/login', { state: { error: errorMessage } });
        }, 3000);
        return;
      }

      // Validate token presence
      if (!token) {
        setError(t('auth.noToken', 'No authentication token received.'));
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        return;
      }

      try {
        // Complete login with the token from OAuth
        await loginWithToken(token);

        // Get user data to determine redirect location
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);

          // Check if user must change password (unlikely for OAuth users, but check anyway)
          if (user.mustChangePassword) {
            navigate('/change-password');
          } else if (user.role === 'admin') {
            navigate('/admin');
          } else if (user.role === 'vendor') {
            navigate('/vendor');
          } else {
            navigate('/');
          }
        } else {
          navigate('/');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || t('auth.oauthError', 'Authentication failed'));
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, loginWithToken, navigate, t]);

  return (
    <div className="oauth-callback-page">
      <div className="oauth-callback-container">
        <div className="oauth-callback-card">
          {error ? (
            <>
              <div className="oauth-error-icon">!</div>
              <h2>{t('auth.oauthError', 'Authentication Error')}</h2>
              <p className="error-message">{error}</p>
              <p className="redirect-message">
                {t('auth.redirecting', 'Redirecting to login...')}
              </p>
            </>
          ) : (
            <>
              <div className="oauth-spinner"></div>
              <h2>{t('auth.authenticating', 'Completing authentication...')}</h2>
              <p>{t('auth.pleaseWait', 'Please wait while we log you in.')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
