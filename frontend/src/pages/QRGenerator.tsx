import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
import { listEventsAdmin, FairEvent } from '../services/eventsService';
import './QRGenerator.css';

type QrTarget = 'map' | 'fair' | 'house' | 'event' | 'schedule' | 'whatsOn';

interface Fair { id: string; name: string; }
interface House { id: string; houseNumber: string; }

// Labels are i18n keys resolved at render time (module-level const).
const TARGETS: { value: QrTarget; labelKey: string; needsId: 'none' | 'fair' | 'house' | 'event' | 'optional-fair' }[] = [
  { value: 'map',      labelKey: 'qr.targets.map',      needsId: 'none' },
  { value: 'fair',     labelKey: 'qr.targets.fair',     needsId: 'fair' },
  { value: 'house',    labelKey: 'qr.targets.house',    needsId: 'house' },
  { value: 'event',    labelKey: 'qr.targets.event',    needsId: 'event' },
  { value: 'schedule', labelKey: 'qr.targets.schedule', needsId: 'optional-fair' },
  { value: 'whatsOn',  labelKey: 'qr.targets.whatsOn',  needsId: 'optional-fair' },
];

const QRGenerator: React.FC = () => {
  const { t } = useTranslation();
  const [target, setTarget] = useState<QrTarget>('map');
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [events, setEvents] = useState<FairEvent[]>([]);
  const [selectedFairId, setSelectedFairId] = useState<string>('');
  const [pickedId, setPickedId] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [size, setSize] = useState<number>(512);
  const [result, setResult] = useState<{ url: string; dataUrl?: string; svg?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminApi.getFairs().then((d: { fairs: Fair[] }) => {
      setFairs(d.fairs || []);
      if (d.fairs?.length) setSelectedFairId(d.fairs[0].id);
    }).catch(() => {});
    adminApi.getVendorHouses().then((d: { vendorHouses?: House[]; houses?: House[] }) => {
      setHouses(d.vendorHouses || d.houses || []);
    }).catch(() => {});
  }, []);

  // Events are fair-scoped so we re-load them when the picker changes. Only
  // matters when target === 'event'; for the others the call is wasted but
  // cheap and keeps the dropdown ready if the admin switches targets.
  useEffect(() => {
    if (!selectedFairId) { setEvents([]); return; }
    listEventsAdmin(selectedFairId).then(setEvents).catch(() => setEvents([]));
  }, [selectedFairId]);

  const targetMeta = TARGETS.find(t => t.value === target)!;

  // The "pick an id" dropdown swaps its options based on the target. Keeping
  // this in one place beats a tangle of conditional <select>s in the JSX.
  const idOptions = useMemo(() => {
    if (targetMeta.needsId === 'fair') return fairs.map(f => ({ id: f.id, label: f.name }));
    if (targetMeta.needsId === 'house') return houses.map(h => ({ id: h.id, label: `#${h.houseNumber}` }));
    if (targetMeta.needsId === 'event') return events.map(e => ({ id: e.id, label: `${e.nameEn} — ${new Date(e.startTime).toLocaleString()}` }));
    return [];
  }, [targetMeta.needsId, fairs, houses, events]);

  // Reset the picked id whenever the target changes so a leftover house id
  // doesn't get smuggled into a fair-target request.
  useEffect(() => { setPickedId(''); }, [target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const payload: Parameters<typeof adminApi.generateQr>[0] = {
        target,
        format,
        size,
      };
      if (targetMeta.needsId === 'fair' || targetMeta.needsId === 'house' || targetMeta.needsId === 'event') {
        if (!pickedId) { setError(t('qr.pickIdError')); setLoading(false); return; }
        payload.id = pickedId;
      } else if (targetMeta.needsId === 'optional-fair') {
        if (selectedFairId) payload.id = selectedFairId;
      }
      if (source.trim()) payload.source = source.trim();
      const res = await adminApi.generateQr(payload);
      setResult(res);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any)?.response?.data?.error ?? t('qr.generationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const downloadName = `qr-${target}-${pickedId || selectedFairId || 'home'}.${format}`;

  return (
    <div className="qr-page">
      <div>
        <h2>{t('qr.title', 'QR code generator')}</h2>
        <p className="lede">
          {t('qr.lede', 'Generate QR codes for printed materials. Each code deep-links into the app so visitors land directly on the right map, vendor, or event.')}
        </p>
      </div>

      <form className="qr-form" onSubmit={submit}>
        <label>
          {t('qr.target', 'What should the QR open?')}
          <select value={target} onChange={(e) => setTarget(e.target.value as QrTarget)}>
            {TARGETS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
          </select>
        </label>

        {(targetMeta.needsId === 'optional-fair' || targetMeta.needsId === 'fair') && (
          <label>
            {t('qr.fair', 'Fair')}
            <select value={selectedFairId} onChange={(e) => setSelectedFairId(e.target.value)}>
              <option value="">{targetMeta.needsId === 'fair' ? t('qr.required') : t('qr.any')}</option>
              {fairs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
        )}

        {(targetMeta.needsId === 'house' || targetMeta.needsId === 'event') && (
          <>
            {targetMeta.needsId === 'event' && (
              <label>
                {t('qr.eventFair', 'Fair (for event picker)')}
                <select value={selectedFairId} onChange={(e) => setSelectedFairId(e.target.value)}>
                  {fairs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>
            )}
            <label>
              {targetMeta.needsId === 'house' ? t('qr.house', 'Vendor house') : t('qr.event', 'Event')}
              <select value={pickedId} onChange={(e) => setPickedId(e.target.value)} required>
                <option value="">{t('qr.pickOne')}</option>
                {idOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
          </>
        )}

        <label>
          {t('qr.source', 'Source tag (optional — for analytics)')}
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder={t('qr.sourcePlaceholder')} />
        </label>

        <label>
          {t('qr.format', 'Format')}
          <select value={format} onChange={(e) => setFormat(e.target.value as 'png' | 'svg')}>
            <option value="png">{t('qr.formatPng')}</option>
            <option value="svg">{t('qr.formatSvg')}</option>
          </select>
        </label>

        <label>
          {t('qr.size', 'Size (px)')}
          <input type="number" min={128} max={2048} step={32} value={size}
                 onChange={(e) => setSize(Number(e.target.value) || 512)} />
        </label>

        <div className="qr-actions">
          <button type="submit" className="qr-btn primary" disabled={loading}>
            {loading ? t('common.generating', 'Generating...') : t('qr.generate', 'Generate')}
          </button>
        </div>
      </form>

      {error && <div className="qr-msg error">{error}</div>}

      {result && (
        <div className="qr-preview">
          {result.dataUrl && <img src={result.dataUrl} alt={t('qr.previewAlt')} />}
          {result.svg && <div dangerouslySetInnerHTML={{ __html: result.svg }} />}
          <div className="meta">
            <div><strong>{t('qr.encoded', 'Encoded URL')}</strong></div>
            <code>{result.url}</code>
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                className="qr-btn ghost"
                href={result.dataUrl ?? `data:image/svg+xml;utf8,${encodeURIComponent(result.svg ?? '')}`}
                download={downloadName}
              >
                {t('qr.download', 'Download')}
              </a>
              <a className="qr-btn ghost" href={result.url} target="_blank" rel="noopener noreferrer">
                {t('qr.testLink', 'Test link')}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;
