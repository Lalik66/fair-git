import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { inviteApi } from '../services/api';
import './InvitePage.css';

interface InviteValidation {
  isValid: boolean;
  inviterName?: string;
  inviterId?: string;
  error?: string;
  code?: string;
}

const InvitePage: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [validation, setValidation] = useState<InviteValidation | null>(null);
  const [acceptResult, setAcceptResult] = useState<{
    success: boolean;
    message: string;
    inviterName?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate the invite token
  const validateInvite = useCallback(async () => {
    if (!token) {
      setError(t('invite.invalidLink'));
      setLoading(false);
      return;
    }

    try {
      const result = await inviteApi.validate(token);
      setValidation(result);
    } catch (err) {
      console.error('Failed to validate invite:', err);
      setError(t('invite.validateFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  // Validate invite when component mounts and user is authenticated
  useEffect(() => {
    if (authLoading) return;

    // If not logged in, redirect to login with return URL in state
    if (!user) {
      navigate('/login', { replace: true, state: { from: { pathname: location.pathname } } });
      return;
    }

    validateInvite();
  }, [user, authLoading, validateInvite, navigate, location.pathname]);

  // Handle accept button click
  const handleAccept = async () => {
    if (!token || !validation?.isValid) return;

    setAccepting(true);
    setError(null);

    try {
      const result = await inviteApi.accept(token);

      if (result.success) {
        setAcceptResult({
          success: true,
          message: result.message,
          inviterName: result.inviterName,
        });

        // Redirect to map after 2 seconds
        setTimeout(() => {
          navigate('/map', { replace: true });
        }, 2000);
      } else {
        setError(result.error || t('invite.acceptFailed'));
      }
    } catch (err: unknown) {
      console.error('Failed to accept invite:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string; code?: string } } };
        const errorData = axiosErr.response?.data;
        if (errorData?.code === 'ALREADY_FOLLOWING') {
          setError(t('invite.alreadyFriends'));
        } else if (errorData?.code === 'SELF_INVITE') {
          setError(t('invite.selfInvite'));
        } else if (errorData?.code === 'EXPIRED') {
          setError(t('invite.expired'));
        } else {
          setError(errorData?.error || t('invite.acceptFailed'));
        }
      } else {
        setError(t('invite.acceptFailed'));
      }
    } finally {
      setAccepting(false);
    }
  };

  // Handle go to map button
  const handleGoToMap = () => {
    navigate('/map', { replace: true });
  };

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <div className="invite-loading">
            <div className="spinner"></div>
            <p>{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while validating invite
  if (loading) {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <div className="invite-loading">
            <div className="spinner"></div>
            <p>{t('invite.validating')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show success message after accepting
  if (acceptResult?.success) {
    return (
      <div className="invite-page">
        <div className="invite-card invite-success">
          <div className="success-icon">✓</div>
          <h1>{t('invite.friendsTitle')}</h1>
          <p>
            {t('invite.friendsBody', { name: acceptResult.inviterName })}
          </p>
          <p className="redirect-notice">{t('invite.redirecting')}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !validation?.isValid) {
    const errorMessage = error || validation?.error || t('invite.invalidLink');
    const errorCode = validation?.code;

    return (
      <div className="invite-page">
        <div className="invite-card invite-error">
          <div className="error-icon">!</div>
          <h1>
            {errorCode === 'EXPIRED'
              ? t('invite.expiredTitle')
              : errorCode === 'ALREADY_FOLLOWING'
              ? t('invite.alreadyTitle')
              : t('invite.invalidTitle')}
          </h1>
          <p>{errorMessage}</p>
          <button className="btn btn-primary" onClick={handleGoToMap}>
            {t('invite.goToMap')}
          </button>
        </div>
      </div>
    );
  }

  // Show valid invite with accept option
  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-icon">+</div>
        <h1>{t('invite.inviteTitle')}</h1>
        <p className="invite-message">
          {t('invite.message', { name: validation.inviterName })}
        </p>
        <p className="invite-description">
          {t('invite.description')}
        </p>
        <div className="invite-actions">
          <button
            className="btn btn-primary btn-accept"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <>
                <span className="btn-spinner"></span>
                {t('invite.accepting')}
              </>
            ) : (
              t('invite.accept')
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleGoToMap}
            disabled={accepting}
          >
            {t('invite.decline')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
