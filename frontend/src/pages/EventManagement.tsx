import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
import { useAdminSearchQuery, matchesQuery } from '../hooks/useAdminSearch';
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_EMOJI,
  EventCategory,
  EventLocationType,
  FairEvent,
  createEvent,
  deleteEvent,
  listEventsAdmin,
  updateEvent,
} from '../services/eventsService';
import { getZonesAdmin } from '../services/zonesService';
import './EventManagement.css';

interface Fair { id: string; name: string; }
interface House { id: string; houseNumber: string; }
interface Facility { id: string; name: string; type: string; }
interface Zone { id: string; name: string; type: string; }

// Labels are i18n keys resolved at render time (module-level const).
const LOCATION_TYPES: { value: EventLocationType; labelKey: string }[] = [
  { value: 'house', labelKey: 'eventAdmin.locationTypes.house' },
  { value: 'facility', labelKey: 'eventAdmin.locationTypes.facility' },
  { value: 'zone', labelKey: 'eventAdmin.locationTypes.zone' },
];

// "2026-06-08T15:30" — what <input type="datetime-local"> wants. Strips
// timezone so the admin enters local fair time. Server stores as UTC after
// the browser's Date parse, which is the correct behaviour because the
// festival happens at a single venue at a single local time.
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_FORM = {
  nameAz: '',
  nameEn: '',
  descriptionAz: '',
  descriptionEn: '',
  category: 'performance' as EventCategory,
  emoji: '',
  startTime: '',
  endTime: '',
  locationType: 'house' as EventLocationType,
  locationId: '',
  isCancelled: false,
};

const EventManagement: React.FC = () => {
  const { t } = useTranslation();

  const [fairs, setFairs] = useState<Fair[]>([]);
  const [selectedFairId, setSelectedFairId] = useState<string>('');

  const [houses, setHouses] = useState<House[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);

  const [events, setEvents] = useState<FairEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Initial loads — fairs, plus the location lookups for the form dropdowns.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminApi.getFairs().catch(() => ({ fairs: [] })),
      adminApi.getVendorHouses().catch(() => ({ vendorHouses: [] })),
      adminApi.getFacilities().catch(() => ({ facilities: [] })),
      // Zones live behind /zones/admin which is fair-scoped; we load them on
      // fair change below. Skipping here keeps the bootstrap cheap.
    ]).then(([fairsRes, housesRes, facilitiesRes]) => {
      if (cancelled) return;
      const fs: Fair[] = fairsRes.fairs || [];
      setFairs(fs);
      if (!selectedFairId && fs.length) setSelectedFairId(fs[0].id);
      setHouses(housesRes.vendorHouses || housesRes.houses || []);
      setFacilities(facilitiesRes.facilities || []);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zones come from the public list (visible only) so the admin can attach
  // events to anything visitors actually see. Drafts (isVisible=false) are
  // intentionally excluded — scheduling against a hidden zone is a footgun.
  useEffect(() => {
    if (!selectedFairId) { setZones([]); return; }
    getZonesAdmin(selectedFairId).then(z => setZones(z)).catch(() => setZones([]));
  }, [selectedFairId]);

  const loadEvents = useCallback(async () => {
    if (!selectedFairId) { setEvents([]); return; }
    setLoading(true);
    try {
      const list = await listEventsAdmin(selectedFairId);
      setEvents(list);
    } catch {
      setMessage({ type: 'error', text: t('eventAdmin.loadFailed', 'Could not load events') });
    } finally {
      setLoading(false);
    }
  }, [selectedFairId, t]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const locationOptions = useMemo(() => {
    if (form.locationType === 'house') return houses.map(h => ({ id: h.id, label: `#${h.houseNumber}` }));
    if (form.locationType === 'facility') return facilities.map(f => ({ id: f.id, label: `${f.name} (${f.type})` }));
    return zones.map(z => ({ id: z.id, label: `${z.name} (${z.type})` }));
  }, [form.locationType, houses, facilities, zones]);

  const locationLabelFor = useCallback(
    (type: EventLocationType, id: string): string => {
      if (type === 'house') return houses.find(h => h.id === id)?.houseNumber ? `#${houses.find(h => h.id === id)!.houseNumber}` : id;
      if (type === 'facility') return facilities.find(f => f.id === id)?.name ?? id;
      return zones.find(z => z.id === id)?.name ?? id;
    },
    [houses, facilities, zones]
  );

  const searchQuery = useAdminSearchQuery();
  const visibleEvents = useMemo(() => {
    if (!searchQuery) return events;
    return events.filter(e =>
      matchesQuery(e.nameEn, searchQuery) ||
      matchesQuery(e.nameAz, searchQuery) ||
      matchesQuery(locationLabelFor(e.locationType, e.locationId), searchQuery)
    );
  }, [events, searchQuery, locationLabelFor]);

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); };

  const beginEdit = (e: FairEvent) => {
    setEditingId(e.id);
    setForm({
      nameAz: e.nameAz,
      nameEn: e.nameEn,
      descriptionAz: e.descriptionAz ?? '',
      descriptionEn: e.descriptionEn ?? '',
      category: e.category,
      emoji: e.emoji ?? '',
      startTime: toLocalInputValue(e.startTime),
      endTime: toLocalInputValue(e.endTime),
      locationType: e.locationType,
      locationId: e.locationId,
      isCancelled: e.isCancelled,
    });
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedFairId) return;
    if (!form.nameAz.trim() || !form.nameEn.trim()) {
      setMessage({ type: 'error', text: t('eventAdmin.nameRequired') }); return;
    }
    if (!form.startTime || !form.endTime) {
      setMessage({ type: 'error', text: t('eventAdmin.timesRequired') }); return;
    }
    if (!form.locationId) {
      setMessage({ type: 'error', text: t('eventAdmin.locationRequired') }); return;
    }
    // datetime-local has no timezone; new Date() interprets it as local time,
    // which is what we want. toISOString() then yields UTC for the wire.
    const payload = {
      ...form,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      emoji: form.emoji.trim() || null,
      descriptionAz: form.descriptionAz.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
    };
    try {
      if (editingId) {
        await updateEvent(editingId, payload);
        setMessage({ type: 'success', text: t('eventAdmin.updated', 'Event updated') });
      } else {
        await createEvent({ ...payload, fairId: selectedFairId });
        setMessage({ type: 'success', text: t('eventAdmin.created', 'Event created') });
      }
      resetForm();
      await loadEvents();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = (err as any)?.response?.data?.error ?? t('eventAdmin.saveFailed');
      setMessage({ type: 'error', text });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('eventAdmin.confirmDelete', 'Delete this event?'))) return;
    try {
      await deleteEvent(id);
      if (editingId === id) resetForm();
      await loadEvents();
    } catch {
      setMessage({ type: 'error', text: t('eventAdmin.deleteFailed') });
    }
  };

  return (
    <div className="event-mgmt">
      <div className="event-mgmt-header">
        <h2>{t('eventAdmin.title', 'Events & schedule')}</h2>
        <p className="lede">
          {t('eventAdmin.lede', 'Tie performances, workshops and showtimes to a specific map location. Visitors see them in the location popup, on the Schedule page, and in the "What\'s On Now" list.')}
        </p>
      </div>

      <div className="event-mgmt-controls">
        <label className="event-fair-picker">
          {t('eventAdmin.fair', 'Fair')}
          <select value={selectedFairId} onChange={(e) => setSelectedFairId(e.target.value)}>
            {fairs.length === 0 && <option value="">{t('eventAdmin.noFairs')}</option>}
            {fairs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
      </div>

      {message && (
        <div className={`event-msg ${message.type}`}>{message.text}</div>
      )}

      <div className="event-grid">
        <div>
          {loading ? (
            <div className="event-msg">{t('common.loading', 'Loading...')}</div>
          ) : events.length === 0 ? (
            <div className="event-msg">{t('eventAdmin.empty', 'No events scheduled for this fair yet.')}</div>
          ) : visibleEvents.length === 0 ? (
            <div className="event-msg">{t('common.noResults', { defaultValue: 'No results found.' })}</div>
          ) : (
            <div className="event-table-wrap">
            <table className="event-table">
              <thead>
                <tr>
                  <th>{t('eventAdmin.when', 'When')}</th>
                  <th>{t('eventAdmin.name', 'Name')}</th>
                  <th>{t('eventAdmin.where', 'Where')}</th>
                  <th>{t('eventAdmin.category', 'Category')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleEvents.map(e => {
                  const s = new Date(e.startTime);
                  const en = new Date(e.endTime);
                  const fmt = (d: Date) =>
                    `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  return (
                    <tr key={e.id} className={`${e.isCancelled ? 'cancelled' : ''} ${editingId === e.id ? 'editing' : ''}`}>
                      <td>{fmt(s)} – {en.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <div><b>{e.nameEn}</b></div>
                        <div style={{ color: '#6b7280', fontSize: 12 }}>{e.nameAz}</div>
                      </td>
                      <td>{t(`eventAdmin.locationTypes.${e.locationType}`, e.locationType)} · {locationLabelFor(e.locationType, e.locationId)}</td>
                      <td>{EVENT_CATEGORY_EMOJI[e.category]} {t(`eventAdmin.categories.${e.category}`, e.category)}</td>
                      <td>
                        <button className="event-btn ghost" onClick={() => beginEdit(e)}>
                          {t('common.edit', 'Edit')}
                        </button>
                        <button className="event-btn danger" onClick={() => handleDelete(e.id)} style={{ marginLeft: 6 }}>
                          {t('common.delete', 'Delete')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <form className="event-form" onSubmit={submit}>
          <h3>{editingId ? t('eventAdmin.editEvent', 'Edit event') : t('eventAdmin.newEvent', 'New event')}</h3>

          <div className="event-form-row">
            <label>
              {t('eventAdmin.nameAz', 'Name (AZ)')}
              <input value={form.nameAz} onChange={e => setForm({ ...form, nameAz: e.target.value })} required />
            </label>
            <label>
              {t('eventAdmin.nameEn', 'Name (EN)')}
              <input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} required />
            </label>
          </div>

          <div className="event-form-row">
            <label>
              {t('eventAdmin.category', 'Category')}
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as EventCategory })}>
                {EVENT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{EVENT_CATEGORY_EMOJI[c]} {t(`eventAdmin.categories.${c}`, c)}</option>
                ))}
              </select>
            </label>
            <label>
              {t('eventAdmin.emoji', 'Emoji (optional)')}
              <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} maxLength={4} placeholder="🎨" />
            </label>
          </div>

          <div className="event-form-row">
            <label>
              {t('eventAdmin.startTime', 'Start time')}
              <input type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
            </label>
            <label>
              {t('eventAdmin.endTime', 'End time')}
              <input type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
            </label>
          </div>

          <div className="event-form-row">
            <label>
              {t('eventAdmin.locationType', 'Location type')}
              <select
                value={form.locationType}
                onChange={e => setForm({ ...form, locationType: e.target.value as EventLocationType, locationId: '' })}
              >
                {LOCATION_TYPES.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
              </select>
            </label>
            <label>
              {t('eventAdmin.location', 'Location')}
              <select value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })} required>
                <option value="">{t('eventAdmin.pickOne')}</option>
                {locationOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
          </div>

          <label>
            {t('eventAdmin.descAz', 'Description (AZ)')}
            <textarea value={form.descriptionAz} onChange={e => setForm({ ...form, descriptionAz: e.target.value })} />
          </label>
          <label>
            {t('eventAdmin.descEn', 'Description (EN)')}
            <textarea value={form.descriptionEn} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} />
          </label>

          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.isCancelled}
              onChange={e => setForm({ ...form, isCancelled: e.target.checked })}
            />
            <span>{t('eventAdmin.cancelled', 'Mark as cancelled (hidden from visitors)')}</span>
          </label>

          <div className="event-form-actions">
            {editingId && (
              <button type="button" className="event-btn ghost" onClick={resetForm}>
                {t('common.cancel', 'Cancel')}
              </button>
            )}
            <button type="submit" className="event-btn primary" disabled={!selectedFairId}>
              {editingId ? t('common.save', 'Save') : t('common.create', 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventManagement;
