import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../services/api';
import { listEvents, EVENT_CATEGORY_EMOJI, FairEvent } from '../services/eventsService';
import './SchedulePage.css';

interface Fair {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

// Group events by "YYYY-MM-DD" of their start time. Picks up multi-day fairs
// naturally and keeps the renderer dumb — a simple ordered Map iteration.
function groupByDay(events: FairEvent[]): Map<string, FairEvent[]> {
  const groups = new Map<string, FairEvent[]>();
  for (const e of events) {
    const d = new Date(e.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }
  return groups;
}

const SchedulePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [selectedFairId, setSelectedFairId] = useState<string>(searchParams.get('fairId') ?? '');
  const [events, setEvents] = useState<FairEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  // Tick "now" once a minute so the "Live now" highlight follows reality
  // without a constant re-render. One minute matches the popup-event-time
  // granularity, which is the smallest unit a visitor cares about here.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    publicApi.getFairs().then((data: { fairs: Fair[] }) => {
      if (cancelled) return;
      const fs = data.fairs || [];
      setFairs(fs);
      if (!selectedFairId) {
        // Prefer an active fair; fall back to the first listed.
        const active = fs.find(f => f.status === 'active');
        const pick = active?.id ?? fs[0]?.id ?? '';
        if (pick) setSelectedFairId(pick);
      }
    }).catch(() => { /* leave fairs empty; page renders an empty state */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedFairId) { setEvents([]); setLoading(false); return; }
    setLoading(true);
    listEvents({ fairId: selectedFairId })
      .then((list) => { if (!cancelled) setEvents(list); })
      .catch(() => { if (!cancelled) setEvents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedFairId]);

  // Keep the URL in sync so reloads and shared links land on the same fair.
  useEffect(() => {
    if (!selectedFairId) return;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('fairId', selectedFairId);
      return params;
    }, { replace: true });
  }, [selectedFairId, setSearchParams]);

  const grouped = useMemo(() => groupByDay(events), [events]);

  const fmtDay = (key: string) => {
    const d = new Date(key);
    return d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'az-AZ', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  };
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="schedule-page">
      <div className="schedule-header">
        <h1>{t('schedule.title', 'Schedule')}</h1>
        <p className="lede">
          {t('schedule.lede', 'Every performance, workshop and showtime. Tap a row to see it on the map.')}
        </p>
      </div>

      <div className="schedule-controls">
        <label>
          {t('schedule.fair', 'Fair')}
          <select value={selectedFairId} onChange={(e) => setSelectedFairId(e.target.value)}>
            {fairs.length === 0 && <option value="">—</option>}
            {fairs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>

        <Link
          to={`/map${selectedFairId ? `?fairId=${selectedFairId}&whatsOn=1` : ''}`}
          className="schedule-now-link"
        >
          {t('schedule.whatsOnNow', "What's on now")} →
        </Link>
      </div>

      {loading ? (
        <div className="schedule-loading">{t('common.loading', 'Loading...')}</div>
      ) : events.length === 0 ? (
        <div className="schedule-empty">
          {t('schedule.empty', 'No events scheduled for this fair yet.')}
        </div>
      ) : (
        Array.from(grouped.entries()).map(([day, dayEvents]) => (
          <div className="schedule-group" key={day}>
            <h2 className="schedule-group-title">{fmtDay(day)}</h2>
            {dayEvents.map(e => {
              const start = new Date(e.startTime).getTime();
              const end = new Date(e.endTime).getTime();
              const isLive = !e.isCancelled && start <= now && now < end;
              const name = i18n.language === 'en' ? e.nameEn : e.nameAz;
              const description = i18n.language === 'en' ? e.descriptionEn : e.descriptionAz;
              return (
                <div
                  key={e.id}
                  className={`schedule-row ${e.isCancelled ? 'cancelled' : ''} ${isLive ? 'live' : ''}`}
                >
                  <div className="schedule-time">
                    {fmtTime(e.startTime)}
                    <small>→ {fmtTime(e.endTime)}</small>
                  </div>
                  <div className="schedule-body">
                    <p className="schedule-name">
                      {e.emoji || EVENT_CATEGORY_EMOJI[e.category]} {name}
                      {isLive && <span className="schedule-live-pill">{t('schedule.live', 'Live')}</span>}
                    </p>
                    <p className="schedule-meta">
                      <span className="badge">{e.category}</span>
                      {e.locationLabel && (
                        <span>📍 {e.locationLabel}</span>
                      )}
                    </p>
                    {description && (
                      <p className="schedule-desc">{description}</p>
                    )}
                  </div>
                  <Link
                    to={`/map?fairId=${selectedFairId}&eventId=${e.id}`}
                    className="schedule-show-btn"
                  >
                    {t('schedule.showOnMap', 'Show on map')}
                  </Link>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
};

export default SchedulePage;
