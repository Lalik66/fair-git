import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sosApi, AdminSosIncident } from '../services/api';
import { connectSocket, getSocket } from '../services/friendsMessagesService';
import './SosDashboard.css';

type Filter = 'ACTIVE' | 'RESOLVED' | 'FALSE_ALARM' | 'all';

const MAPBOX_TOKEN = (import.meta as any).env.VITE_MAPBOX_TOKEN || '';
const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3002/api';
const BACKEND_ORIGIN = API_URL.replace(/\/api\/?$/, '');

/** Static Mapbox image with a red pin — no live map lifecycle per card. */
function staticMapUrl(lat: number, lng: number): string | null {
  if (!MAPBOX_TOKEN) return null;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `pin-l+d92d20(${lng},${lat})/${lng},${lat},16/560x240@2x?access_token=${MAPBOX_TOKEN}`
  );
}

/** Local uploads are served as relative /uploads/… paths; Cloudinary is absolute. */
function resolveAudioUrl(url: string): string {
  return url.startsWith('http') ? url : `${BACKEND_ORIGIN}${url}`;
}

/** Two-tone attention beep via WebAudio — no sound asset needed. */
function playAlertSound(): void {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = i % 2 === 0 ? 880 : 660;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
  } catch {
    // Audio blocked (no user gesture yet) — the visual flash still runs.
  }
}

/**
 * Admin — live SOS security dashboard. New incidents arrive over the shared
 * Socket.io connection (`sos:new` / `sos:updated` in the `security` room);
 * the list is also fetched on load and refetched on every event so multiple
 * dashboards stay consistent.
 */
const SosDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [incidents, setIncidents] = useState<AdminSosIncident[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  // Close-out flow: which incident has its note box open, for which action.
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closingAction, setClosingAction] = useState<'resolve' | 'false_alarm'>('resolve');
  const [closingNote, setClosingNote] = useState('');
  const [flashId, setFlashId] = useState<string | null>(null);
  const filterRef = useRef<Filter>('ACTIVE');
  filterRef.current = filter;

  const load = useCallback(async (f: Filter) => {
    try {
      setError(null);
      const data = await sosApi.getAdminIncidents(f);
      setIncidents(data.incidents);
      setActiveCount(data.activeCount);
    } catch (err: any) {
      setError(err.response?.data?.error || t('sosDashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    setLoading(true);
    load(filter);
  }, [filter, load]);

  // Live events. The socket is the shared app connection; only the listeners
  // are ours, so cleanup removes them without disconnecting anything else.
  useEffect(() => {
    let sock;
    try {
      sock = connectSocket();
    } catch {
      return; // No token — ProtectedRoute will have redirected anyway.
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const onNew = (incident: AdminSosIncident) => {
      playAlertSound();
      setFlashId(incident.id);
      setTimeout(() => setFlashId(null), 4000);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(t('sosDashboard.notifyTitle', '🆘 SOS alert at the fair'), {
          body:
            incident.senderName ||
            t('sosDashboard.anonymous', 'Anonymous visitor'),
        });
      }
      load(filterRef.current);
    };
    const onUpdated = () => load(filterRef.current);

    sock.on('sos:new', onNew);
    sock.on('sos:updated', onUpdated);
    return () => {
      const s = getSocket();
      s?.off('sos:new', onNew);
      s?.off('sos:updated', onUpdated);
    };
  }, [load, t]);

  const close = async (id: string, action: 'resolve' | 'false_alarm', note?: string) => {
    try {
      setActingOn(id);
      await sosApi.closeIncident(id, action, note);
      setClosingId(null);
      setClosingNote('');
      await load(filter);
    } catch (err: any) {
      setError(err.response?.data?.error || t('sosDashboard.actionError'));
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

  const FILTERS: Filter[] = ['ACTIVE', 'RESOLVED', 'FALSE_ALARM', 'all'];

  return (
    <div className="sos-dashboard-container">
      <div className="page-header">
        <h1>{t('sosDashboard.title')}</h1>
        {activeCount > 0 && (
          <span className="sd-active-badge">
            {t('sosDashboard.activeCount', { count: activeCount })}
          </span>
        )}
      </div>

      <div className="sd-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`sd-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {t(`sosDashboard.filter.${f}`)}
          </button>
        ))}
      </div>

      {loading && <p className="sd-status">{t('common.loading')}</p>}
      {error && <p className="sd-status sd-error">{error}</p>}

      {!loading && !error && incidents.length === 0 && (
        <p className="sd-status">{t('sosDashboard.empty')}</p>
      )}

      {!loading && incidents.length > 0 && (
        <ul className="sd-list">
          {incidents.map((inc) => {
            const mapUrl =
              inc.latitude !== null && inc.longitude !== null
                ? staticMapUrl(inc.latitude, inc.longitude)
                : null;
            return (
              <li
                key={inc.id}
                className={`sd-card sd-card-${inc.status.toLowerCase()} ${flashId === inc.id ? 'sd-card-flash' : ''}`}
              >
                <div className="sd-card-head">
                  <span className={`sd-chip sd-chip-${inc.status.toLowerCase()}`}>
                    {t(`sosDashboard.filter.${inc.status}`)}
                  </span>
                  <strong className="sd-sender">
                    {inc.senderName || t('sosDashboard.anonymous', 'Anonymous visitor')}
                  </strong>
                  {inc.senderEmail && <span className="sd-email">{inc.senderEmail}</span>}
                  <span className="sd-date">{formatDate(inc.createdAt)}</span>
                </div>

                {inc.latitude !== null && inc.longitude !== null ? (
                  <div className="sd-location">
                    {mapUrl && (
                      <a
                        href={`https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t('sosDashboard.openInMaps', 'Open in Google Maps')}
                      >
                        {/* Deliberately not lazy — security needs the incident map instantly. */}
                        <img className="sd-map" src={mapUrl} alt="" />
                      </a>
                    )}
                    <div className="sd-coords">
                      📍 {inc.latitude.toFixed(6)}, {inc.longitude.toFixed(6)}
                      {inc.accuracy !== null && (
                        <span className="sd-accuracy">
                          {' '}±{Math.round(inc.accuracy)} {t('sosDashboard.meters', 'm')}
                        </span>
                      )}
                      <a
                        className="sd-maps-link"
                        href={`https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('sosDashboard.openInMaps', 'Open in Google Maps')} ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="sd-no-location">
                    ⚠ {t('sosDashboard.noLocation', 'No location — the visitor denied or lacked GPS. Check the voice message or recent camera zones.')}
                  </p>
                )}

                {inc.audioUrl && (
                  <div className="sd-audio">
                    <span className="sd-audio-label">
                      🎙 {t('sosDashboard.voiceMessage', 'Voice message')}
                    </span>
                    <audio controls preload="none" src={resolveAudioUrl(inc.audioUrl)} />
                  </div>
                )}

                {inc.status !== 'ACTIVE' && (
                  <p className="sd-resolution">
                    {t('sosDashboard.closedAt', 'Closed')}: {inc.resolvedAt ? formatDate(inc.resolvedAt) : '—'}
                    {inc.resolutionNote && <> — {inc.resolutionNote}</>}
                  </p>
                )}

                {inc.status === 'ACTIVE' && (
                  <div className="sd-actions">
                    {closingId === inc.id ? (
                      <div className="sd-close-form">
                        <input
                          type="text"
                          value={closingNote}
                          onChange={(e) => setClosingNote(e.target.value)}
                          placeholder={t('sosDashboard.notePlaceholder', 'Note (optional)…')}
                          maxLength={500}
                        />
                        <button
                          className={closingAction === 'resolve' ? 'sd-btn-resolve' : 'sd-btn-false'}
                          disabled={actingOn === inc.id}
                          onClick={() => close(inc.id, closingAction, closingNote || undefined)}
                        >
                          {closingAction === 'resolve'
                            ? t('sosDashboard.confirmResolve', 'Confirm resolved')
                            : t('sosDashboard.confirmFalse', 'Confirm false alarm')}
                        </button>
                        <button className="sd-btn-cancel" onClick={() => setClosingId(null)}>
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="sd-btn-resolve"
                          disabled={actingOn === inc.id}
                          onClick={() => { setClosingId(inc.id); setClosingAction('resolve'); setClosingNote(''); }}
                        >
                          ✓ {t('sosDashboard.resolve', 'Resolve')}
                        </button>
                        <button
                          className="sd-btn-false"
                          disabled={actingOn === inc.id}
                          onClick={() => { setClosingId(inc.id); setClosingAction('false_alarm'); setClosingNote(''); }}
                        >
                          {t('sosDashboard.falseAlarm', 'False alarm')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SosDashboard;
