import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { publicApi } from '../services/api';
import '../components/EventCard.css';
import './FairDetail.css';

const FALLBACK_BANNER = '/istiraklar.jpg';

interface FairVendor {
  id: string;
  companyName: string | null;
  productCategory: string | null;
  logoUrl: string | null;
  ownerName: string | null;
}

interface Fair {
  id: string;
  name: string;
  descriptionAz: string | null;
  descriptionEn: string | null;
  startDate: string;
  endDate: string;
  locationAddress: string | null;
  status: string;
  bannerImageUrl: string | null;
  mapCenterLat: number | null;
  mapCenterLng: number | null;
  gallery?: string[];
  archiveVideoUrl?: string | null;
  vendors?: FairVendor[];
}

const FairDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [fair, setFair] = useState<Fair | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    publicApi
      .getPublicFair(id)
      .then((data) => {
        if (cancelled) return;
        setFair(data.fair);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) setNotFound(true);
        else console.error('Error fetching fair:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(
      i18n.language === 'en' ? 'en-US' : 'az-AZ',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

  const vendorTarget = !user
    ? '/login'
    : user.role === 'admin'
      ? '/admin'
      : user.role === 'vendor'
        ? '/vendor/applications'
        : '/profile/applications';

  if (loading) {
    return (
      <div className="fair-detail-state">
        <div className="fair-detail-spinner" aria-label={t('common.loading', 'Loading')} />
      </div>
    );
  }

  if (notFound || !fair) {
    return (
      <div className="fair-detail-state">
        <h2>{t('fairDetail.notFoundTitle', "This fair isn't available")}</h2>
        <p>{t('fairDetail.notFoundBody', 'It may have ended or been moved.')}</p>
        <Link to="/" className="event-card-btn event-card-btn-primary">
          {t('fairDetail.backToAll', 'See all events')}
        </Link>
      </div>
    );
  }

  const description = i18n.language === 'en' ? fair.descriptionEn : fair.descriptionAz;
  const banner = fair.bannerImageUrl || FALLBACK_BANNER;
  const hasMap = fair.mapCenterLat != null && fair.mapCenterLng != null;
  const isPast = fair.status === 'archived' || fair.status === 'completed';
  const gallery = fair.gallery ?? [];
  const vendors = fair.vendors ?? [];
  const badgeText = isPast
    ? fair.status === 'completed'
      ? t('welcome.status.completed', 'Completed')
      : t('welcome.status.archived', 'Archived')
    : fair.status === 'active'
      ? t('welcome.status.live', 'Live Now')
      : t('welcome.status.upcoming', 'Coming Soon');
  const getCategoryLabel = (category: string | null) =>
    category ? t(`categories.${category}`, category) : t('categories.other', 'Other');

  return (
    <div className="fair-detail">
      <Link to="/" className="fair-detail-back">
        ← {t('fairDetail.allFairs', 'All fairs')}
      </Link>

      <header
        className="fair-detail-hero"
        style={{ backgroundImage: `url(${banner})` }}
      >
        <div className="fair-detail-hero-overlay" />
        <div className="fair-detail-hero-content">
          <span className={`fair-detail-badge ${fair.status}`}>
            {badgeText}
          </span>
          <h1 className="fair-detail-title">{fair.name}</h1>
        </div>
      </header>

      <div className="fair-detail-meta">
        <div className="fair-detail-meta-item">
          <span className="fair-detail-meta-icon" aria-hidden="true">📅</span>
          <div>
            <div className="fair-detail-meta-label">{t('fairDetail.dates', 'Dates')}</div>
            <div className="fair-detail-meta-value">
              {formatDate(fair.startDate)} → {formatDate(fair.endDate)}
            </div>
          </div>
        </div>
        {fair.locationAddress && (
          <div className="fair-detail-meta-item">
            <span className="fair-detail-meta-icon" aria-hidden="true">📍</span>
            <div>
              <div className="fair-detail-meta-label">{t('fairDetail.location', 'Location')}</div>
              <div className="fair-detail-meta-value">{fair.locationAddress}</div>
            </div>
          </div>
        )}
      </div>

      {(!isPast || hasMap) && (
        <div className="fair-detail-actions">
          {!isPast && (
            <Link to={vendorTarget} className="event-card-btn event-card-btn-primary">
              {t('welcome.cta.applyVendor', 'Become a vendor')}
            </Link>
          )}
          {hasMap && (
            <Link
              to={`/map?fairId=${fair.id}`}
              className="event-card-btn event-card-btn-secondary"
            >
              {t('welcome.viewOnMap', 'View on Map')}
            </Link>
          )}
        </div>
      )}

      {description && (
        <section className="fair-detail-body">
          <h2 className="fair-detail-section-title">
            {t('fairDetail.aboutTitle', 'About this fair')}
          </h2>
          <p className="fair-detail-description">{description}</p>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="fair-detail-section">
          <h2 className="fair-detail-section-title">
            {t('fairDetail.galleryTitle', 'Gallery')}
          </h2>
          <div className="fair-detail-gallery">
            {gallery.map((src, i) => (
              <a
                key={`${src}-${i}`}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="fair-detail-gallery-item"
              >
                <img src={src} alt="" loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      )}

      {fair.archiveVideoUrl && (
        <section className="fair-detail-section">
          <h2 className="fair-detail-section-title">
            {t('fairDetail.videoTitle', 'Video')}
          </h2>
          <div className="fair-detail-video">
            <video src={fair.archiveVideoUrl} controls preload="metadata" />
          </div>
        </section>
      )}

      {vendors.length > 0 && (
        <section className="fair-detail-section">
          <h2 className="fair-detail-section-title">
            {t('fairDetail.vendorsTitle', 'Participating vendors')}
          </h2>
          <div className="fair-detail-vendors">
            {vendors.map((vendor) => {
              const name = vendor.companyName || vendor.ownerName || t('about.anonymousVendor', 'Vendor');
              const initial = name.charAt(0).toUpperCase();
              return (
                <div className="fair-detail-vendor" key={vendor.id}>
                  {vendor.logoUrl ? (
                    <img className="fair-detail-vendor-logo-img" src={vendor.logoUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="fair-detail-vendor-logo">{initial}</div>
                  )}
                  <div className="fair-detail-vendor-info">
                    <b>{name}</b>
                    <span>{getCategoryLabel(vendor.productCategory)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default FairDetail;
