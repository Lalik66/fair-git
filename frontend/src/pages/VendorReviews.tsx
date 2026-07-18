import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reviewsApi, PublicReview } from '../services/api';
import './VendorReviews.css';

/**
 * Vendor portal — published reviews about the vendor's own profile, with an
 * inline reply form on each. Only APPROVED (public) reviews appear here;
 * pending ones are invisible until moderation clears them.
 */
const VendorReviews: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reviewsApi.getMyVendorReviews();
      setReviews(data.reviews);
      setAvgRating(data.vendor.avgRating);
      setReviewCount(data.vendor.reviewCount);
    } catch (err: any) {
      setError(err.response?.data?.error || t('reviews.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      setSavingReply(true);
      await reviewsApi.replyToReview(reviewId, replyText.trim());
      setReplyingTo(null);
      setReplyText('');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || t('reviews.replyError'));
    } finally {
      setSavingReply(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const stars = (value: number) => (
    <span className="vr-stars" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? 'vr-star filled' : 'vr-star'}>★</span>
      ))}
    </span>
  );

  return (
    <div className="vendor-reviews-container">
      <div className="page-header">
        <h1>{t('reviews.vendorPageTitle')}</h1>
        <div className="vr-summary">
          {stars(avgRating)}
          <span className="vr-avg">{reviewCount > 0 ? avgRating.toFixed(1) : '—'}</span>
          <span className="vr-count">{t('reviews.count', { count: reviewCount })}</span>
        </div>
      </div>

      {loading && <p className="vr-status">{t('common.loading')}</p>}
      {error && <p className="vr-status vr-error">{error}</p>}

      {!loading && !error && reviews.length === 0 && (
        <p className="vr-status">{t('reviews.noneVendor')}</p>
      )}

      {!loading && reviews.length > 0 && (
        <ul className="vr-list">
          {reviews.map((r) => (
            <li key={r.id} className="vr-card">
              <div className="vr-card-head">
                <span className="vr-name">{r.visitorName}</span>
                {stars(r.rating)}
                <span className="vr-date">{formatDate(r.createdAt)}</span>
              </div>
              {r.comment && <p className="vr-comment">{r.comment}</p>}

              {r.vendorReply ? (
                <div className="vr-reply">
                  <span className="vr-reply-label">{t('reviews.vendorReply')}</span>
                  <p>{r.vendorReply}</p>
                </div>
              ) : replyingTo === r.id ? (
                <div className="vr-reply-form">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder={t('reviews.replyPlaceholder')}
                  />
                  <div className="vr-reply-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setReplyingTo(null); setReplyText(''); }}
                      disabled={savingReply}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleReply(r.id)}
                      disabled={savingReply || !replyText.trim()}
                    >
                      {savingReply ? t('common.loading') : t('reviews.sendReply')}
                    </button>
                  </div>
                </div>
              ) : (
                <button className="vr-reply-btn" onClick={() => { setReplyingTo(r.id); setReplyText(''); }}>
                  {t('reviews.reply')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VendorReviews;
