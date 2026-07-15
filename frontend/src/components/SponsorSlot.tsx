import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BannerPlacement,
  SponsorBanner,
  listBanners,
  trackBannerEvent,
} from '../services/bannersService';
import './SponsorSlot.css';

interface Props {
  placement: BannerPlacement;
  /** Optional fair scope — global banners always match, fair banners match only when this is set. */
  fairId?: string;
  /** Visual variant; matches the CSS modifier. */
  variant?: 'bottom' | 'inline' | 'compact';
  /** Hide the "Sponsored" label (used in compact map overlay where space is tight). */
  hideLabel?: boolean;
}

// Returns one banner from the active set, rotating once per mount. Always
// picking [0] would starve lower-priority banners; a single random pick on
// mount gives them a fair share while keeping the render deterministic for
// the session.
function pickOne(banners: SponsorBanner[]): SponsorBanner | null {
  if (banners.length === 0) return null;
  if (banners.length === 1) return banners[0];
  const top = banners[0];
  const ties = banners.filter(b => b.priority === top.priority);
  return ties[Math.floor(Math.random() * ties.length)];
}

const SponsorSlot: React.FC<Props> = ({ placement, fairId, variant = 'inline', hideLabel = false }) => {
  const { t } = useTranslation();
  const [banner, setBanner] = useState<SponsorBanner | null>(null);
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listBanners(placement, fairId)
      .then(list => { if (!cancelled) setBanner(pickOne(list)); })
      .catch(() => { if (!cancelled) setBanner(null); });
    return () => { cancelled = true; };
  }, [placement, fairId]);

  // One impression per (banner, mount). Guarded by ref so a re-render from a
  // parent state change doesn't double-count.
  useEffect(() => {
    if (!banner) return;
    if (trackedRef.current === banner.id) return;
    trackedRef.current = banner.id;
    trackBannerEvent(banner.id, 'impression');
  }, [banner]);

  if (!banner) return null;

  const handleClick = () => {
    trackBannerEvent(banner.id, 'click');
  };

  const inner = (
    <>
      <img
        src={banner.imageUrl}
        alt={banner.altText ?? ''}
        loading="lazy"
      />
      {!hideLabel && <span className="sponsor-label">{t('sponsor.sponsored')}</span>}
    </>
  );

  if (banner.linkUrl) {
    return (
      <a
        href={banner.linkUrl}
        target="_blank"
        rel="noopener sponsored"
        className={`sponsor-slot sponsor-slot--${variant}`}
        onClick={handleClick}
      >
        {inner}
      </a>
    );
  }
  return <div className={`sponsor-slot sponsor-slot--${variant}`}>{inner}</div>;
};

export default SponsorSlot;
