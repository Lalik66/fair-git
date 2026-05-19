import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { applicationApi } from '../services/api';
import './VendorApplications.css';

interface MyApplication {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  fairId: string;
  fairName: string;
  fairStartDate: string;
  fairEndDate: string;
  fairStatus: string;
  houseId: string;
  houseNumber: string;
}

// The applicant-facing "Applications" tab. Works for a regular `user`
// (unlike VendorApplications which is gated to existing vendors).
const ApplicantApplications: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(
    Boolean((location.state as { justSubmitted?: boolean } | null)?.justSubmitted)
  );

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationApi.getMine();
      setApplications(response.applications);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch applications:', err);
      setError(err.response?.data?.error || t('vendor.form.loadError', 'Failed to load applications'));
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge status-pending">{t('vendor.status.pending', 'Pending')}</span>;
      case 'approved':
        return <span className="status-badge status-approved">{t('vendor.status.approved', 'Approved')}</span>;
      case 'rejected':
        return <span className="status-badge status-rejected">{t('vendor.status.rejected', 'Rejected')}</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="vendor-applications">
      <div className="page-header">
        <h1>{t('vendor.myApplications', 'My Applications')}</h1>
        <div className="page-header-actions">
          <button onClick={() => navigate('/applications/new')} className="btn btn-primary">
            {t('vendor.newApplication', 'New Application')}
          </button>
          <button onClick={fetchApplications} className="btn btn-secondary btn-refresh">
            {t('common.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="success-message">
          {t('vendor.success', 'Your application has been received')}
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">{t('common.loading', 'Loading...')}</div>
      ) : error ? (
        <>
          <div className="error-message">{error}</div>
          <button onClick={fetchApplications} className="btn btn-primary">
            {t('common.refresh', 'Try Again')}
          </button>
        </>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <p>{t('vendor.noApplications', 'You have not submitted any applications yet.')}</p>
          <button onClick={() => navigate('/applications/new')} className="btn btn-primary">
            {t('vendor.newApplication', 'New Application')}
          </button>
        </div>
      ) : (
        <div className="applications-grid">
          {applications.map((app) => (
            <div key={app.id} className={`application-card application-${app.status}`}>
              <div className="application-header">
                <h3>{app.fairName}</h3>
                {getStatusBadge(app.status)}
              </div>

              <div className="application-details">
                <div className="detail-row">
                  <span className="detail-label">{t('application.submittedAt', 'Submitted')}:</span>
                  <span className="detail-value">{formatDateTime(app.submittedAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t('vendor.form.houseNumber', 'House number')}:</span>
                  <span className="detail-value">{app.houseNumber}</span>
                </div>
              </div>

              {app.status === 'rejected' && app.rejectionReason && (
                <div className="rejection-reason">
                  <strong>{t('application.rejectionReason', 'Rejection Reason')}:</strong>
                  <p>{app.rejectionReason}</p>
                </div>
              )}

              {app.reviewedAt && (
                <div className="review-info">
                  <span className="review-label">
                    {app.status === 'approved'
                      ? t('application.approvedOn', 'Approved on')
                      : t('application.rejectedOn', 'Rejected on')}
                    :
                  </span>
                  <span>{formatDateTime(app.reviewedAt)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicantApplications;
