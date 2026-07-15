import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EVENT_CATEGORY_EMOJI, FairEvent, listEvents } from '../services/eventsService';
import './WhatsOnNowPanel.css';

interface Props {
  /** Active fair the visitor is currently looking at. Empty string disables the panel. */
  fairId: string;
  /** Called when the visitor closes the panel (X button / backdrop click). */
  onClose: () => void;
  /**
   * Optional override for the row tap behaviour. Defaults to navigating to
   * /map?eventId=… so the existing MapPage deep-link handles the fly + popup.
   * Map page passes its own handler so a tap doesn't trigger a route change.
   */
  onPick?: (event: FairEvent) => void;
}

// Render the event's start/end window. Same-day events stay compact ("14:00
// –16:00") because the date is implied. Multi-day events (a 3-day Mugham
// festival, a week-long bazaar) include the date with each clock time so
// the visitor isn't left wondering when "ends 16:00" actually refers to.
// We deliberately omit the year — festival dates are within the current
// season, and adding "2026" four times per row would only add noise.
function timeWindow(startIso: string, endIso: string, lang: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  const time = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}`;
  };
  if (sameDay) {
    return lang === 'en'
      ? `started ${time(start)}, ends ${time(end)}`
      : `${time(start)}–${time(end)}`;
  }
  return lang === 'en'
    ? `started ${date(start)} ${time(start)}, ends ${date(end)} ${time(end)}`
    : `${date(start)} ${time(start)} – ${date(end)} ${time(end)}`;
}

const WhatsOnNowPanel: React.FC<Props> = ({ fairId, onClose, onPick }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState<FairEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!fairId) { setEvents([]); setLoading(false); return; }
    try {
      const list = await listEvents({ fairId, nowOnly: true });
      setEvents(list);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [fairId]);

  // Initial load + 60s poll. The list is small and read-mostly, so polling is
  // simpler than wiring a socket. Tab-aware so a backgrounded tab doesn't
  // keep hammering the API.
  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (!document.hidden) load();
    }, 60_000);
    return () => { clearInterval(interval); };
  }, [load]);

  const handlePick = (e: FairEvent) => {
    if (onPick) onPick(e);
    else navigate(`/map?fairId=${fairId}&eventId=${e.id}`);
    onClose();
  };

  return (
    <div className="whats-on-overlay" onClick={onClose}>
      <div className="whats-on-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="whats-on-header">
          <h2>{t('whatsOn.title', "What's on now")}</h2>
          <button className="whats-on-close" onClick={onClose} aria-label={t('common.close', 'Close')}>×</button>
        </div>
        <div className="whats-on-body">
          {loading ? (
            <div className="whats-on-empty">{t('common.loading', 'Loading...')}</div>
          ) : events.length === 0 ? (
            <div className="whats-on-empty">
              {t('whatsOn.nothing', 'Nothing happening right now. Check the full schedule for what is coming up.')}
              <div style={{ marginTop: 12 }}>
                <Link to={`/schedule?fairId=${fairId}`} onClick={onClose}>
                  {t('whatsOn.seeSchedule', 'See full schedule →')}
                </Link>
              </div>
            </div>
          ) : (
            events.map((e) => {
              const name = i18n.language === 'en' ? e.nameEn : e.nameAz;
              const description = i18n.language === 'en' ? e.descriptionEn : e.descriptionAz;
              // "Craft workshop — Craft Zone — started 15:00, ends 16:00".
              // Joining with em-dashes echoes the format the user spec'd in
              // their original notes and reads cleanly on one line.
              const parts = [
                e.locationLabel ? e.locationLabel : null,
                timeWindow(e.startTime, e.endTime, i18n.language),
              ].filter(Boolean);
              return (
                <button key={e.id} className="whats-on-row" onClick={() => handlePick(e)}>
                  <span className="whats-on-emoji">{e.emoji || EVENT_CATEGORY_EMOJI[e.category]}</span>
                  <div>
                    <p className="whats-on-name">{name}</p>
                    <p className="whats-on-meta">{parts.join(' — ')}</p>
                    {description && <p className="whats-on-desc">{description}</p>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsOnNowPanel;
