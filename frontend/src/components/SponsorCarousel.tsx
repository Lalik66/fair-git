import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BannerPlacement,
  SponsorBanner,
  listBanners,
  trackBannerEvent,
} from '../services/bannersService';
import './SponsorCarousel.css';

interface Props {
  placement: BannerPlacement;
  /** Optional fair scope — global banners always match, fair banners match only when this is set. */
  fairId?: string;
  /** Milliseconds between auto-advances. */
  intervalMs?: number;
}

const SponsorCarousel: React.FC<Props> = ({ placement, fairId, intervalMs = 5000 }) => {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<SponsorBanner[]>([]);
  const [idx, setIdx] = useState(0);
  // Track each banner once per mount so a re-render or auto-advance back to a
  // previously-shown slide doesn't double-count impressions.
  const trackedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    listBanners(placement, fairId)
      .then(list => {
        if (cancelled) return;
        setBanners(list);
        setIdx(0);
        trackedRef.current = new Set();
      })
      .catch(() => { if (!cancelled) setBanners([]); });
    return () => { cancelled = true; };
  }, [placement, fairId]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), intervalMs);
    return () => clearInterval(t);
  }, [banners.length, intervalMs]);

  useEffect(() => {
    const current = banners[idx];
    if (!current) return;
    if (trackedRef.current.has(current.id)) return;
    trackedRef.current.add(current.id);
    trackBannerEvent(current.id, 'impression');
  }, [banners, idx]);

  if (banners.length === 0) return null;
  const current = banners[idx];
  if (!current) return null;

  const handleClick = () => trackBannerEvent(current.id, 'click');

  const slide = (
    <img
      key={current.id}
      src={current.imageUrl}
      alt={current.altText ?? ''}
      loading="lazy"
      className="sponsor-carousel__img"
    />
  );

  return (
    <div className="sponsor-carousel" role="region" aria-label={t('sponsor.sponsored')}>
      {current.linkUrl ? (
        <a
          href={current.linkUrl}
          target="_blank"
          rel="noopener sponsored"
          className="sponsor-carousel__slide"
          onClick={handleClick}
        >
          {slide}
        </a>
      ) : (
        <div className="sponsor-carousel__slide">{slide}</div>
      )}

      <span className="sponsor-carousel__label">{t('sponsor.sponsored')}</span>

      {banners.length > 1 && (
        <div className="sponsor-carousel__dots" role="tablist">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Banner ${i + 1} of ${banners.length}`}
              className={`sponsor-carousel__dot${i === idx ? ' is-active' : ''}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SponsorCarousel;
