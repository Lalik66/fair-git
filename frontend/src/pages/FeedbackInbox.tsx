import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { feedbackApi, SiteFeedbackItem } from '../services/api';
import './FeedbackInbox.css';

type Filter = 'unread' | 'all';

/**
 * Admin — organizers' inbox for fair feedback submitted from the About page
 * form. Read-only stream (no moderation/publishing): mark items read so the
 * team knows what has been handled, delete spam.
 */
const FeedbackInbox: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<SiteFeedbackItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const load = useCallback(async (f: Filter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await feedbackApi.getAdminFeedback(f);
      setItems(data.feedback);
      setUnreadCount(data.unreadCount);
    } catch (err: any) {
      setError(err.response?.data?.error || t('feedbackInbox.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const toggleRead = async (item: SiteFeedbackItem) => {
    try {
      setActingOn(item.id);
      await feedbackApi.setRead(item.id, !item.isRead);
      await load(filter);
    } catch (err: any) {
      setError(err.response?.data?.error || t('feedbackInbox.actionError'));
    } finally {
      setActingOn(null);
    }
  };

  const remove = async (id: string) => {
    try {
      setActingOn(id);
      await feedbackApi.remove(id);
      setConfirmingDelete(null);
      await load(filter);
    } catch (err: any) {
      setError(err.response?.data?.error || t('feedbackInbox.actionError'));
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
    <span className="fi-stars" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? 'fi-star filled' : 'fi-star'}>★</span>
      ))}
    </span>
  );

  return (
    <div className="feedback-inbox-container">
      <div className="page-header">
        <h1>{t('feedbackInbox.title')}</h1>
        {unreadCount > 0 && (
          <span className="fi-unread-badge">
            {t('feedbackInbox.unreadCount', { count: unreadCount })}
          </span>
        )}
      </div>

      <div className="fi-filters">
        {(['all', 'unread'] as Filter[]).map((f) => (
          <button
            key={f}
            className={`fi-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {t(`feedbackInbox.filter.${f}`)}
          </button>
        ))}
      </div>

      {loading && <p className="fi-status">{t('common.loading')}</p>}
      {error && <p className="fi-status fi-error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="fi-status">{t('feedbackInbox.empty')}</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="fi-list">
          {items.map((item) => (
            <li key={item.id} className={`fi-card ${item.isRead ? 'fi-card-read' : 'fi-card-unread'}`}>
              <div className="fi-card-head">
                {!item.isRead && <span className="fi-new-chip">{t('feedbackInbox.newChip')}</span>}
                <div className="fi-meta-rating">
                  {stars(item.rating)}
                  <strong>{item.rating}/5</strong>
                </div>
                <span className="fi-date">{formatDate(item.createdAt)}</span>
              </div>

              <div className="fi-card-from">
                <span className="fi-meta-label">{t('feedbackInbox.fromLabel')}</span>
                <strong>{item.name || t('feedbackInbox.anonymous')}</strong>
                {item.email && <span className="fi-meta-email">{item.email}</span>}
              </div>

              <p className="fi-message">{item.message}</p>

              <div className="fi-actions">
                <button
                  className="fi-btn-read"
                  disabled={actingOn === item.id}
                  onClick={() => toggleRead(item)}
                >
                  {item.isRead ? t('feedbackInbox.markUnread') : t('feedbackInbox.markRead')}
                </button>
                {confirmingDelete === item.id ? (
                  <>
                    <button
                      className="fi-btn-delete"
                      disabled={actingOn === item.id}
                      onClick={() => remove(item.id)}
                    >
                      {t('feedbackInbox.confirmDelete')}
                    </button>
                    <button className="fi-btn-cancel" onClick={() => setConfirmingDelete(null)}>
                      {t('common.cancel')}
                    </button>
                  </>
                ) : (
                  <button
                    className="fi-btn-delete"
                    disabled={actingOn === item.id}
                    onClick={() => setConfirmingDelete(item.id)}
                  >
                    {t('feedbackInbox.delete')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FeedbackInbox;
