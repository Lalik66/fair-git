import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sosApi } from '../services/api';
import './SosButton.css';

/**
 * Floating emergency SOS button (visitor pages only — mounted once in App).
 *
 * Flow: tap → full-screen confirm with a 5-second auto-send countdown
 * (panic-friendly, still stops pocket taps) → alert is sent immediately with
 * whatever geolocation the browser yields (denial/timeout must never block
 * it) → optional 10-second voice message afterwards → live status until
 * security resolves the incident.
 */

type Stage = 'idle' | 'confirm' | 'sending' | 'sent' | 'error';
type RecordState = 'idle' | 'recording' | 'uploading' | 'done' | 'failed';

const COUNTDOWN_SECONDS = 5;
const MAX_RECORD_SECONDS = 10;
const STATUS_POLL_MS = 5000;
const GEO_TIMEOUT_MS = 10000;

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 30000 }
    );
  });
}

function pickRecorderMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
}

const SosButton: React.FC = () => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [incidentStatus, setIncidentStatus] = useState<'ACTIVE' | 'RESOLVED' | 'FALSE_ALARM'>('ACTIVE');
  const [locationShared, setLocationShared] = useState(false);
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderMimeRef = useRef<string>('');
  const sendingRef = useRef(false);

  const send = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setStage('sending');
    try {
      const pos = await getPosition();
      const coords = pos
        ? {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? undefined,
          }
        : undefined;
      const { incident } = await sosApi.raise(coords);
      setIncidentId(incident.id);
      setIncidentStatus('ACTIVE');
      setLocationShared(!!coords);
      setRecordState('idle');
      setRecordSeconds(0);
      setStage('sent');
    } catch {
      setStage('error');
    } finally {
      sendingRef.current = false;
    }
  }, []);

  // Confirm-stage countdown; hitting zero auto-sends.
  useEffect(() => {
    if (stage !== 'confirm') return;
    if (countdown <= 0) {
      send();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, countdown, send]);

  // While the alert is open and active, poll so the visitor sees "resolved".
  useEffect(() => {
    if (stage !== 'sent' || !incidentId || incidentStatus !== 'ACTIVE') return;
    const timer = setInterval(async () => {
      try {
        const { incident } = await sosApi.getStatus(incidentId);
        setIncidentStatus(incident.status);
      } catch {
        // Transient poll failures are ignored — the alert already went out.
      }
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [stage, incidentId, incidentStatus]);

  const openConfirm = () => {
    // While an alert is still active, the button reopens its status panel
    // instead of raising a second incident.
    if (incidentId && incidentStatus === 'ACTIVE') {
      setStage('sent');
      return;
    }
    setIncidentId(null);
    setCountdown(COUNTDOWN_SECONDS);
    setStage('confirm');
  };

  const dismiss = () => {
    if (incidentStatus !== 'ACTIVE') setIncidentId(null);
    setStage('idle');
  };

  const startRecording = async () => {
    const mime = pickRecorderMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      setRecordState('failed');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderMimeRef.current = recorder.mimeType || mime || 'audio/webm';
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (!incidentId || chunks.length === 0) {
          setRecordState('failed');
          return;
        }
        setRecordState('uploading');
        try {
          const blob = new Blob(chunks, { type: recorderMimeRef.current });
          await sosApi.attachAudio(incidentId, blob, recorderMimeRef.current);
          setRecordState('done');
        } catch {
          setRecordState('failed');
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecordSeconds(0);
      setRecordState('recording');
    } catch {
      // Mic permission denied or no device.
      setRecordState('failed');
    }
  };

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  // Recording tick + auto-stop at the 10-second cap.
  useEffect(() => {
    if (recordState !== 'recording') return;
    if (recordSeconds >= MAX_RECORD_SECONDS) {
      stopRecording();
      return;
    }
    const timer = setTimeout(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearTimeout(timer);
  }, [recordState, recordSeconds, stopRecording]);

  const isOverlayOpen = stage === 'confirm' || stage === 'sending' || stage === 'sent' || stage === 'error';
  const hasActiveAlert = !!incidentId && incidentStatus === 'ACTIVE';

  return (
    <>
      <button
        type="button"
        className={`sos-fab ${hasActiveAlert ? 'sos-fab-active' : ''}`}
        onClick={openConfirm}
        aria-label={t('sos.buttonAria', 'Emergency SOS')}
      >
        <span className="sos-fab-ring" aria-hidden="true" />
        SOS
      </button>

      {isOverlayOpen && (
        <div className="sos-overlay" role="alertdialog" aria-modal="true">
          <div className="sos-card">
            {stage === 'confirm' && (
              <>
                <h2 className="sos-title">{t('sos.confirm.title', 'Send emergency alert?')}</h2>
                <p className="sos-body">
                  {t('sos.confirm.body', 'Fair security will be notified immediately and will see your location.')}
                </p>
                <div className="sos-countdown" aria-live="assertive">{countdown}</div>
                <p className="sos-countdown-note">
                  {t('sos.confirm.sendingIn', 'Sending automatically…')}
                </p>
                <div className="sos-actions">
                  <button type="button" className="sos-btn-send" onClick={send}>
                    {t('sos.confirm.sendNow', 'Send now')}
                  </button>
                  <button type="button" className="sos-btn-cancel" onClick={dismiss}>
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              </>
            )}

            {stage === 'sending' && (
              <>
                <h2 className="sos-title">{t('sos.sending', 'Sending alert…')}</h2>
                <div className="sos-spinner" aria-hidden="true" />
              </>
            )}

            {stage === 'sent' && (
              <>
                <h2 className="sos-title sos-title-sent">
                  {incidentStatus === 'ACTIVE'
                    ? t('sos.sent.title', 'Alert sent')
                    : t('sos.sent.resolvedTitle', 'Incident resolved')}
                </h2>
                <p className="sos-body">
                  {incidentStatus === 'ACTIVE'
                    ? t('sos.sent.body', 'Fair security has been notified and is on the way. Stay where you are if it is safe.')
                    : t('sos.sent.resolvedBody', 'Security has marked your alert as handled. Stay safe!')}
                </p>
                <p className="sos-location-note">
                  {locationShared
                    ? t('sos.sent.locationOk', 'Your location was shared with security.')
                    : t('sos.sent.locationMissing', 'Location unavailable — if you can, tell staff where you are or stay near a landmark.')}
                </p>

                {incidentStatus === 'ACTIVE' && (
                  <div className="sos-audio-block">
                    {recordState === 'idle' && (
                      <button type="button" className="sos-btn-record" onClick={startRecording}>
                        🎙 {t('sos.audio.cta', 'Add a 10-second voice message')}
                      </button>
                    )}
                    {recordState === 'recording' && (
                      <button type="button" className="sos-btn-record sos-recording" onClick={stopRecording}>
                        ⏺ {t('sos.audio.recording', 'Recording…')} {MAX_RECORD_SECONDS - recordSeconds}s —{' '}
                        {t('sos.audio.stop', 'tap to stop')}
                      </button>
                    )}
                    {recordState === 'uploading' && (
                      <p className="sos-audio-note">{t('sos.audio.uploading', 'Sending voice message…')}</p>
                    )}
                    {recordState === 'done' && (
                      <p className="sos-audio-note sos-audio-done">✓ {t('sos.audio.done', 'Voice message sent to security.')}</p>
                    )}
                    {recordState === 'failed' && (
                      <p className="sos-audio-note sos-audio-failed">
                        {t('sos.audio.failed', 'Could not record — check the microphone permission. Your alert was still sent.')}
                      </p>
                    )}
                  </div>
                )}

                <div className="sos-actions">
                  <button type="button" className="sos-btn-cancel" onClick={dismiss}>
                    {incidentStatus === 'ACTIVE' ? t('sos.sent.hide', 'Hide') : t('common.close', 'Close')}
                  </button>
                </div>
                {incidentStatus === 'ACTIVE' && (
                  <p className="sos-status-note" aria-live="polite">
                    {t('sos.sent.statusActive', 'This panel updates when security responds.')}
                  </p>
                )}
              </>
            )}

            {stage === 'error' && (
              <>
                <h2 className="sos-title">{t('sos.error.title', 'Could not send the alert')}</h2>
                <p className="sos-body">
                  {t('sos.error.body', 'Please try again — or contact any staff member on site immediately.')}
                </p>
                <div className="sos-actions">
                  <button type="button" className="sos-btn-send" onClick={send}>
                    {t('sos.error.retry', 'Try again')}
                  </button>
                  <button type="button" className="sos-btn-cancel" onClick={dismiss}>
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SosButton;
