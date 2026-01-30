import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { vendorApi } from '../services/api';
import './VendorApplications.css';

interface Application {
  id: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedAt?: string;
  fairId: string;
  fairName: string;
  fairStartDate: string;
  fairEndDate: string;
  fairStatus: string;
  houseId: string;
  houseNumber: string;
  houseArea: number;
  housePrice: number;
}

const VendorApplications: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await vendorApi.getApplications();
      setApplications(response.applications);
    } catch (err: any) {
      console.error('Failed to fetch applications:', err);
      setError(err.response?.data?.error || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge status-pending">{t('application.status.pending', 'Pending')}</span>;
      case 'approved':
        return <span className="status-badge status-approved">{t('application.status.approved', 'Approved')}</span>;
      case 'rejected':
        return <span className="status-badge status-rejected">{t('application.status.rejected', 'Rejected')}</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="vendor-applications">
        <h1>{t('vendor.myApplications', 'My Applications')}</h1>
        <div className="loading-spinner">{t('common.loading', 'Loading...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vendor-applications">
        <h1>{t('vendor.myApplications', 'My Applications')}</h1>
        <div className="error-message">{error}</div>
        <button onClick={fetchApplications} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="vendor-applications">
      <div className="page-header">
        <h1>{t('vendor.myApplications', 'My Applications')}</h1>
        <div className="page-header-actions">
          <button onClick={() => navigate('/map')} className="btn btn-primary">
            {t('vendor.newApplication', '+ New Application')}
          </button>
          <button onClick={fetchApplications} className="btn btn-secondary btn-refresh">
            {t('common.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">
          <p>{t('vendor.noApplications', 'You have not submitted any applications yet.')}</p>
          <p className="empty-hint">
            {t('vendor.applyHint', 'Visit the map to browse available houses and submit an application.')}
          </p>
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
                  <span className="detail-label">{t('application.house', 'House')}:</span>
                  <span className="detail-value">{app.houseNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t('application.area', 'Area')}:</span>
                  <span className="detail-value">{app.houseArea?.toFixed(1)} m²</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t('application.price', 'Price')}:</span>
                  <span className="detail-value">${app.housePrice?.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t('application.fairDates', 'Fair Dates')}:</span>
                  <span className="detail-value">
                    {formatDate(app.fairStartDate)} - {formatDate(app.fairEndDate)}
                  </span>
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
                      : t('application.rejectedOn', 'Rejected on')}:
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

export default VendorApplications;
