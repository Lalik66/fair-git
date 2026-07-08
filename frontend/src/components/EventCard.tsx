import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import './EventCard.css';

const FALLBACK_BANNER = '/istiraklar.jpg';

export interface EventCardFair {
  id: string;
  name: string;
  descriptionAz: string | null;
  descriptionEn: string | null;
  startDate: string;
  endDate: string;
  locationAddress: string | null;
  status: string;
  bannerImageUrl?: string | null;
}

interface Props {
  fair: EventCardFair;
  // 'upcoming' (default) = Home behavior: Apply + More info, Live/Coming-Soon badge.
  // 'archive' = About §06 behavior: More info only, Archived/Completed badge.
  variant?: 'upcoming' | 'archive';
}

const EventCard: React.FC<Props> = ({ fair, variant = 'upcoming' }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const rootRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // Fallback for old browsers or reduced-motion — just reveal immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      i18n.language === 'en' ? 'en-US' : 'az-AZ',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  const description = i18n.language === 'en' ? fair.descriptionEn : fair.descriptionAz;
  const banner = fair.bannerImageUrl || FALLBACK_BANNER;
  const isArchive = variant === 'archive';

  const badgeText = isArchive
    ? fair.status === 'completed'
      ? t('welcome.status.completed', 'Completed')
      : t('welcome.status.archived', 'Archived')
    : fair.status === 'active'
      ? t('welcome.status.live', 'Live Now')
      : t('welcome.status.upcoming', 'Coming Soon');

  const vendorTarget = !user
    ? '/login'
    : user.role === 'admin'
      ? '/admin'
      : user.role === 'vendor'
        ? '/vendor/applications'
        : '/profile/applications';

  return (
    <article
      ref={rootRef}
      className={`event-card event-card-reveal${visible ? ' is-visible' : ''}`}
    >
      <div className="event-card-media">
        <img src={banner} alt="" loading="lazy" />
      </div>
      <div className="event-card-body">
        <span className={`event-card-badge ${fair.status}`}>
          {badgeText}
        </span>
        <h3 className="event-card-title">{fair.name}</h3>
        <div className="event-card-meta">
          <div className="event-card-meta-row">
            <span className="event-card-icon" aria-hidden="true">📅</span>
            <span>{formatDate(fair.startDate)} – {formatDate(fair.endDate)}</span>
          </div>
          {fair.locationAddress && (
            <div className="event-card-meta-row">
              <span className="event-card-icon" aria-hidden="true">📍</span>
              <span>{fair.locationAddress}</span>
            </div>
          )}
        </div>
        {description && <p className="event-card-description">{description}</p>}
        <div className="event-card-actions">
          {!isArchive && (
            <Link to={vendorTarget} className="event-card-btn event-card-btn-primary">
              {t('welcome.cta.applyVendor', 'Become a vendor')}
            </Link>
          )}
          <Link
            to={`/fairs/${fair.id}`}
            className={`event-card-btn ${isArchive ? 'event-card-btn-primary' : 'event-card-btn-secondary'}`}
          >
            {t('welcome.moreInfo', 'More info')} →
          </Link>
        </div>
      </div>
    </article>
  );
};

export default EventCard;
