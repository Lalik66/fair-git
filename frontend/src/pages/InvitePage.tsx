import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    try {
      const result = await inviteApi.validate(token);
      setValidation(result);
    } catch (err) {
      console.error('Failed to validate invite:', err);
      setError('Failed to validate invite link');
    } finally {
      setLoading(false);
    }
  }, [token]);

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
        setError(result.error || 'Failed to accept invite');
      }
    } catch (err: unknown) {
      console.error('Failed to accept invite:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string; code?: string } } };
        const errorData = axiosErr.response?.data;
        if (errorData?.code === 'ALREADY_FOLLOWING') {
          setError('You are already friends!');
        } else if (errorData?.code === 'SELF_INVITE') {
          setError('You cannot accept your own invite');
        } else if (errorData?.code === 'EXPIRED') {
          setError('This invite link has expired');
        } else {
          setError(errorData?.error || 'Failed to accept invite');
        }
      } else {
        setError('Failed to accept invite');
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
            <p>Loading...</p>
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
            <p>Validating invite...</p>
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
          <h1>You are now friends!</h1>
          <p>
            You and <strong>{acceptResult.inviterName}</strong> can now see each
            other's location on the map.
          </p>
          <p className="redirect-notice">Redirecting to map...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !validation?.isValid) {
    const errorMessage = error || validation?.error || 'Invalid invite link';
    const errorCode = validation?.code;

    return (
      <div className="invite-page">
        <div className="invite-card invite-error">
          <div className="error-icon">!</div>
          <h1>
            {errorCode === 'EXPIRED'
              ? 'Invite Expired'
              : errorCode === 'ALREADY_FOLLOWING'
              ? 'Already Friends'
              : 'Invalid Invite'}
          </h1>
          <p>{errorMessage}</p>
          <button className="btn btn-primary" onClick={handleGoToMap}>
            Go to Map
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
        <h1>Friend Invite</h1>
        <p className="invite-message">
          <strong>{validation.inviterName}</strong> wants to be friends with you
          on Fair Marketplace!
        </p>
        <p className="invite-description">
          By accepting, you'll be able to see each other's location on the map.
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
                Accepting...
              </>
            ) : (
              'Accept Invite'
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleGoToMap}
            disabled={accepting}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
