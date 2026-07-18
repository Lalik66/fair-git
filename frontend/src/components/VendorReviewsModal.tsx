import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  reviewsApi,
  VendorReviewsResponse,
  ReviewCategories,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './VendorReviewsModal.css';

interface VendorReviewsModalProps {
  vendorProfileId: string;
  vendorName: string;
  onClose: () => void;
}

const CATEGORY_KEYS: Array<keyof ReviewCategories> = ['quality', 'service', 'priceValue'];

/** Read-only star row: ★★★★☆ */
const Stars: React.FC<{ value: number; small?: boolean }> = ({ value, small }) => (
  <span className={`vrm-stars ${small ? 'vrm-stars-small' : ''}`} aria-label={`${value}/5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={i <= Math.round(value) ? 'vrm-star filled' : 'vrm-star'}>
        ★
      </span>
    ))}
  </span>
);

/** Interactive star input. */
const StarInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  label: string;
}> = ({ value, onChange, label }) => (
  <div className="vrm-star-input-row">
    <span className="vrm-star-input-label">{label}</span>
    <span className="vrm-star-input" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          className={i <= value ? 'vrm-star-btn filled' : 'vrm-star-btn'}
          onClick={() => onChange(i)}
        >
          ★
        </button>
      ))}
    </span>
  </div>
);

const VendorReviewsModal: React.FC<VendorReviewsModalProps> = ({
  vendorProfileId,
  vendorName,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [data, setData] = useState<VendorReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [categories, setCategories] = useState<ReviewCategories>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await reviewsApi.getVendorReviews(vendorProfileId);
      setData(resp);
      // Prefill the form from the caller's existing review, if any.
      if (resp.myReview) {
        setRating(resp.myReview.rating);
        setCategories(resp.myReview.categories || {});
        setComment(resp.myReview.comment || '');
      }
    } catch {
      setError(t('reviews.loadError'));
    } finally {
      setLoading(false);
    }
  }, [vendorProfileId, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setSubmitMessage({ type: 'error', text: t('reviews.ratingRequired') });
      return;
    }
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const payload: {
        vendorId: string;
        rating: number;
        categories?: ReviewCategories;
        comment?: string;
      } = { vendorId: vendorProfileId, rating };
      const filledCategories = Object.fromEntries(
        Object.entries(categories).filter(([, v]) => typeof v === 'number' && v >= 1)
      );
      if (Object.keys(filledCategories).length > 0) payload.categories = filledCategories;
      if (comment.trim()) payload.comment = comment.trim();

      await reviewsApi.submitReview(payload);
      setSubmitMessage({ type: 'success', text: t('reviews.submitted') });
      setFormOpen(false);
      await load();
    } catch {
      setSubmitMessage({ type: 'error', text: t('reviews.submitError') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (reviewId: string) => {
    try {
      await reviewsApi.reportReview(reviewId);
      setReportedIds((prev) => new Set(prev).add(reviewId));
    } catch {
      // Non-critical; ignore.
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const myStatus = data?.myReview?.status ?? null;
  const canReview = !!user && !!data && !data.vendor.isOwnProfile;

  return (
    <div className="vrm-overlay" onClick={onClose}>
      <div
        className="vrm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('reviews.title', { name: vendorName })}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vrm-header">
          <div>
            <h3 className="vrm-title">{vendorName}</h3>
            {data && (
              <div className="vrm-summary">
                <Stars value={data.vendor.avgRating} />
                <span className="vrm-avg">{data.vendor.avgRating > 0 ? data.vendor.avgRating.toFixed(1) : '—'}</span>
                <span className="vrm-count">
                  {t('reviews.count', { count: data.vendor.reviewCount })}
                </span>
              </div>
            )}
          </div>
          <button className="vrm-close" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>

        <div className="vrm-body">
          {loading && <p className="vrm-status-text">{t('common.loading')}</p>}
          {error && <p className="vrm-status-text vrm-error">{error}</p>}

          {!loading && !error && data && (
            <>
              {/* My review status banner */}
              {myStatus === 'PENDING' && (
                <div className="vrm-banner vrm-banner-pending">
                  {t('reviews.myPending')}
                </div>
              )}
              {myStatus === 'REJECTED' && (
                <div className="vrm-banner vrm-banner-rejected">
                  {t('reviews.myRejected')}
                  {data.myReview?.rejectionReason ? ` — ${data.myReview.rejectionReason}` : ''}
                </div>
              )}
              {submitMessage && (
                <div className={`vrm-banner ${submitMessage.type === 'success' ? 'vrm-banner-pending' : 'vrm-banner-rejected'}`}>
                  {submitMessage.text}
                </div>
              )}

              {/* Write / edit review */}
              {canReview && !formOpen && (
                <button className="vrm-write-btn" onClick={() => setFormOpen(true)}>
                  {data.myReview ? t('reviews.editMine') : t('reviews.writeOne')}
                </button>
              )}
              {!user && (
                <p className="vrm-login-hint">{t('reviews.loginToReview')}</p>
              )}

              {canReview && formOpen && (
                <form className="vrm-form" onSubmit={handleSubmit}>
                  <StarInput
                    value={rating}
                    onChange={setRating}
                    label={t('reviews.overall')}
                  />
                  <div className="vrm-form-categories">
                    {CATEGORY_KEYS.map((key) => (
                      <StarInput
                        key={key}
                        value={categories[key] || 0}
                        onChange={(v) => setCategories((prev) => ({ ...prev, [key]: v }))}
                        label={t(`reviews.category.${key}`)}
                      />
                    ))}
                  </div>
                  <textarea
                    className="vrm-comment-input"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('reviews.commentPlaceholder')}
                    maxLength={2000}
                    rows={4}
                  />
                  <div className="vrm-form-actions">
                    <button
                      type="button"
                      className="vrm-btn-secondary"
                      onClick={() => setFormOpen(false)}
                      disabled={submitting}
                    >
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="vrm-btn-primary" disabled={submitting}>
                      {submitting ? t('common.loading') : t('reviews.submit')}
                    </button>
                  </div>
                  <p className="vrm-moderation-note">{t('reviews.moderationNote')}</p>
                </form>
              )}

              {/* Review list */}
              {data.reviews.length === 0 ? (
                <p className="vrm-status-text">{t('reviews.none')}</p>
              ) : (
                <ul className="vrm-list">
                  {data.reviews.map((r) => (
                    <li key={r.id} className="vrm-item">
                      <div className="vrm-item-head">
                        <span className="vrm-item-name">{r.visitorName}</span>
                        <Stars value={r.rating} small />
                        <span className="vrm-item-date">{formatDate(r.createdAt)}</span>
                      </div>
                      {r.categories && (
                        <div className="vrm-item-categories">
                          {CATEGORY_KEYS.filter((k) => r.categories?.[k]).map((k) => (
                            <span key={k} className="vrm-cat-chip">
                              {t(`reviews.category.${k}`)}: {r.categories?.[k]}/5
                            </span>
                          ))}
                        </div>
                      )}
                      {r.comment && <p className="vrm-item-comment">{r.comment}</p>}
                      {r.vendorReply && (
                        <div className="vrm-reply">
                          <span className="vrm-reply-label">{t('reviews.vendorReply')}</span>
                          <p className="vrm-reply-text">{r.vendorReply}</p>
                        </div>
                      )}
                      {user && !data.vendor.isOwnProfile && (
                        <button
                          className="vrm-report-btn"
                          onClick={() => handleReport(r.id)}
                          disabled={reportedIds.has(r.id)}
                        >
                          {reportedIds.has(r.id) ? t('reviews.reported') : t('reviews.report')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorReviewsModal;
