import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reviewsApi, AdminReview } from '../services/api';
import './ReviewModeration.css';

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'all';

/**
 * Admin — review moderation queue. Every review starts PENDING and is
 * invisible to the public until approved here. Reported published reviews
 * float to the top of the APPROVED tab for a second look.
 */
const ReviewModeration: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  // Rejection flow: which review has its reason box open, and the reason text.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async (filter: StatusFilter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await reviewsApi.getAdminReviews(filter);
      setReviews(data.reviews);
      setPendingCount(data.pendingCount);
    } catch (err: any) {
      setError(err.response?.data?.error || t('reviews.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const decide = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      setActingOn(id);
      await reviewsApi.moderateReview(id, action, reason);
      setRejectingId(null);
      setRejectReason('');
      await load(status);
    } catch (err: any) {
      setError(err.response?.data?.error || t('reviews.moderateError'));
    } finally {
      setActingOn(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const stars = (value: number) => (
    <span className="rm-stars" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? 'rm-star filled' : 'rm-star'}>★</span>
      ))}
    </span>
  );

  const FILTERS: StatusFilter[] = ['PENDING', 'APPROVED', 'REJECTED', 'all'];

  return (
    <div className="review-moderation-container">
      <div className="page-header">
        <h1>{t('reviews.moderationTitle')}</h1>
        {pendingCount > 0 && (
          <span className="rm-pending-badge">
            {t('reviews.pendingCount', { count: pendingCount })}
          </span>
        )}
      </div>

      <div className="rm-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`rm-filter-btn ${status === f ? 'active' : ''}`}
            onClick={() => setStatus(f)}
          >
            {t(`reviews.filter.${f}`)}
          </button>
        ))}
      </div>

      {loading && <p className="rm-status">{t('common.loading')}</p>}
      {error && <p className="rm-status rm-error">{error}</p>}

      {!loading && !error && reviews.length === 0 && (
        <p className="rm-status">{t('reviews.queueEmpty')}</p>
      )}

      {!loading && reviews.length > 0 && (
        <ul className="rm-list">
          {reviews.map((r) => {
            const visitorName =
              `${r.visitor.firstName || ''} ${r.visitor.lastName || ''}`.trim() || r.visitor.email;
            return (
              <li key={r.id} className={`rm-card rm-card-${r.status.toLowerCase()}`}>
                <div className="rm-card-head">
                  <span className={`rm-status-chip rm-chip-${r.status.toLowerCase()}`}>
                    {t(`reviews.filter.${r.status}`)}
                  </span>
                  {r.reportCount > 0 && (
                    <span className="rm-report-chip">
                      ⚠ {t('reviews.reportCount', { count: r.reportCount })}
                    </span>
                  )}
                  <span className="rm-date">{formatDate(r.createdAt)}</span>
                </div>

                <div className="rm-card-meta">
                  <div>
                    <span className="rm-meta-label">{t('reviews.vendorLabel')}</span>
                    <strong>{r.vendor.companyName || r.vendor.id}</strong>
                  </div>
                  <div>
                    <span className="rm-meta-label">{t('reviews.visitorLabel')}</span>
                    <strong>{visitorName}</strong>
                    <span className="rm-meta-email">{r.visitor.email}</span>
                  </div>
                  <div className="rm-meta-rating">
                    {stars(r.rating)}
                    <strong>{r.rating}/5</strong>
                  </div>
                </div>

                {r.categories && (
                  <div className="rm-categories">
                    {(['quality', 'service', 'priceValue'] as const)
                      .filter((k) => r.categories?.[k])
                      .map((k) => (
                        <span key={k} className="rm-cat-chip">
                          {t(`reviews.category.${k}`)}: {r.categories?.[k]}/5
                        </span>
                      ))}
                  </div>
                )}

                {r.comment && <p className="rm-comment">{r.comment}</p>}
                {r.vendorReply && (
                  <p className="rm-vendor-reply">
                    <em>{t('reviews.vendorReply')}:</em> {r.vendorReply}
                  </p>
                )}
                {r.status === 'REJECTED' && r.rejectionReason && (
                  <p className="rm-reject-reason">
                    {t('reviews.rejectionReason')}: {r.rejectionReason}
                  </p>
                )}

                {/* Decisions: pending reviews get both; approved can be
                    retracted (re-reject) when reports pile up. */}
                {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                  <div className="rm-actions">
                    {r.status === 'PENDING' && (
                      <button
                        className="rm-btn-approve"
                        disabled={actingOn === r.id}
                        onClick={() => decide(r.id, 'approve')}
                      >
                        {t('reviews.approve')}
                      </button>
                    )}
                    {rejectingId === r.id ? (
                      <div className="rm-reject-form">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder={t('reviews.rejectReasonPlaceholder')}
                          maxLength={500}
                        />
                        <button
                          className="rm-btn-reject"
                          disabled={actingOn === r.id}
                          onClick={() => decide(r.id, 'reject', rejectReason || undefined)}
                        >
                          {t('reviews.confirmReject')}
                        </button>
                        <button
                          className="rm-btn-cancel"
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="rm-btn-reject"
                        disabled={actingOn === r.id}
                        onClick={() => { setRejectingId(r.id); setRejectReason(''); }}
                      >
                        {t('reviews.reject')}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ReviewModeration;
