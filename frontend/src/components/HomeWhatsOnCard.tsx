import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EVENT_CATEGORY_EMOJI, FairEvent, listEvents } from '../services/eventsService';
import './WhatsOnNowPanel.css';

interface Props {
  /** Live fair id whose program we surface. Empty string suppresses the card. */
  fairId: string;
}

// Compact homepage card: top 3 events happening right now plus a link to the
// fuller view on /map. Hides itself entirely when there is nothing live, so
// off-season or pre-opening visitors don't see a dead slot.
const HomeWhatsOnCard: React.FC<Props> = ({ fairId }) => {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<FairEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!fairId) { setLoaded(true); return; }
    listEvents({ fairId, nowOnly: true })
      .then((list) => { if (!cancelled) setEvents(list); })
      .catch(() => { if (!cancelled) setEvents([]); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [fairId]);

  if (!loaded || events.length === 0) return null;

  const top = events.slice(0, 3);
  return (
    <div className="whats-on-card">
      <h3>
        <span className="dot" style={{ width: 8, height: 8, background: '#7C3AED', borderRadius: '50%' }} />
        {t('whatsOn.title', "What's on now")}
      </h3>
      {top.map((e) => {
        const name = i18n.language === 'en' ? e.nameEn : e.nameAz;
        return (
          <Link
            key={e.id}
            to={`/map?fairId=${fairId}&eventId=${e.id}`}
            className="whats-on-row"
            style={{ borderBottom: '1px solid #f3f4f6', textDecoration: 'none', color: 'inherit' }}
          >
            <span className="whats-on-emoji">{e.emoji || EVENT_CATEGORY_EMOJI[e.category]}</span>
            <div>
              <p className="whats-on-name">{name}</p>
              <p className="whats-on-meta">{e.locationLabel ? `📍 ${e.locationLabel}` : null}</p>
            </div>
            <span className="whats-on-countdown">→</span>
          </Link>
        );
      })}
      <Link to={`/map?fairId=${fairId}&whatsOn=1`} className="whats-on-card-link">
        {t('whatsOn.seeAll', 'See all →')}
      </Link>
    </div>
  );
};

export default HomeWhatsOnCard;
