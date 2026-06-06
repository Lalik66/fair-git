import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
// MapboxDraw is admin-only — it ships behind this route (which is gated on
// role=admin), so visitors never pay the bundle cost.
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { adminApi } from '../services/api';
import {
  getZonesAdmin,
  createZone,
  updateZone,
  deleteZone,
  MapZone,
  ZoneType,
  ZONE_PRESETS,
} from '../services/zonesService';
import './ZoneManagement.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN || '';

interface Fair {
  id: string;
  name: string;
  mapCenterLat: number | null;
  mapCenterLng: number | null;
}

const ZONE_TYPES: ZoneType[] = ['food', 'kids', 'vip', 'craft', 'stage', 'info', 'other'];

const ZONE_SRC = 'admin-zones-src';
const FILL_LAYER = 'admin-zones-fill';
const LINE_LAYER = 'admin-zones-line';

const ZoneManagement: React.FC = () => {
  const { t } = useTranslation();

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [fairs, setFairs] = useState<Fair[]>([]);
  const [selectedFairId, setSelectedFairId] = useState<string>('');
  const [zones, setZones] = useState<MapZone[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingZone, setEditingZone] = useState<MapZone | null>(null);

  // Pending polygon waiting for the form to be filled in
  const [pendingGeometry, setPendingGeometry] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: ZoneType;
    descriptionAz: string;
    descriptionEn: string;
  }>({
    name: '',
    type: 'food',
    descriptionAz: '',
    descriptionEn: '',
  });

  // Initial fairs load
  useEffect(() => {
    let cancelled = false;
    adminApi
      .getFairs()
      .then((data: { fairs: Fair[] }) => {
        if (cancelled) return;
        setFairs(data.fairs || []);
        // Default to the first fair so the admin lands somewhere useful.
        if (!selectedFairId && data.fairs?.length) {
          setSelectedFairId(data.fairs[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: 'error', text: t('zoneAdmin.loadFairsFailed', 'Could not load fairs') });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload zones when fair changes
  const loadZones = useCallback(async () => {
    if (!selectedFairId) {
      setZones([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getZonesAdmin(selectedFairId);
      setZones(list);
    } catch {
      setMessage({ type: 'error', text: t('zoneAdmin.loadZonesFailed', 'Could not load zones') });
    } finally {
      setLoading(false);
    }
  }, [selectedFairId, t]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Init Mapbox once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [49.8671, 40.4093], // Baku fallback
      zoom: 16,
    });

    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: 'simple_select',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapRef.current.addControl(drawRef.current as unknown as mapboxgl.IControl, 'top-left');
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current.on('load', () => {
      const m = mapRef.current!;
      m.addSource(ZONE_SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      m.addLayer({
        id: FILL_LAYER,
        type: 'fill',
        source: ZONE_SRC,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['get', 'opacity'],
        },
      });
      m.addLayer({
        id: LINE_LAYER,
        type: 'line',
        source: ZONE_SRC,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': 0.85,
        },
      });
    });

    // When the user finishes drawing, capture the polygon and wait for them
    // to fill in the form. Remove the temporary draw feature once captured so
    // the rendered overlay (added below on save) doesn't double-up.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapRef.current.on('draw.create', (e: any) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry?.type !== 'Polygon') return;
      setPendingGeometry(JSON.stringify(feature.geometry));
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, []);

  // Re-center map when the selected fair changes
  useEffect(() => {
    const fair = fairs.find((f) => f.id === selectedFairId);
    if (!fair || !mapRef.current) return;
    if (typeof fair.mapCenterLat === 'number' && typeof fair.mapCenterLng === 'number') {
      mapRef.current.flyTo({
        center: [fair.mapCenterLng, fair.mapCenterLat],
        zoom: 17,
      });
    }
  }, [selectedFairId, fairs]);

  // Render existing zones into the map source
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const refresh = () => {
      const src = m.getSource(ZONE_SRC) as mapboxgl.GeoJSONSource | undefined;
      if (!src) return;
      src.setData({
        type: 'FeatureCollection',
        features: zones
          .map((z) => {
            try {
              return {
                type: 'Feature' as const,
                id: z.id,
                properties: {
                  id: z.id,
                  name: z.name,
                  color: z.color,
                  opacity: z.isVisible === false ? Math.min(z.opacity * 0.4, 0.15) : z.opacity,
                },
                geometry: JSON.parse(z.geometry),
              };
            } catch {
              return null;
            }
          })
          .filter((f): f is NonNullable<typeof f> => f !== null),
      } as never);
    };
    if (m.isStyleLoaded()) refresh();
    else m.once('load', refresh);
  }, [zones]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), message.type === 'success' ? 2000 : 3500);
    return () => clearTimeout(timer);
  }, [message]);

  const handleStartDraw = () => {
    if (!selectedFairId) {
      setMessage({ type: 'error', text: t('zoneAdmin.pickFairFirst', 'Pick a fair first') });
      return;
    }
    drawRef.current?.changeMode('draw_polygon');
    setEditingZone(null);
    setPendingGeometry(null);
    setFormData({ name: '', type: 'food', descriptionAz: '', descriptionEn: '' });
  };

  const handleCancelPending = () => {
    drawRef.current?.deleteAll();
    setPendingGeometry(null);
    setEditingZone(null);
  };

  const handleSubmit = async () => {
    if (!selectedFairId) return;
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: t('zoneAdmin.nameRequired', 'Name is required') });
      return;
    }
    try {
      if (editingZone) {
        await updateZone(editingZone.id, {
          name: formData.name.trim(),
          type: formData.type,
          descriptionAz: formData.descriptionAz || null,
          descriptionEn: formData.descriptionEn || null,
        });
        setMessage({ type: 'success', text: t('zoneAdmin.updated', 'Zone updated') });
      } else {
        if (!pendingGeometry) {
          setMessage({ type: 'error', text: t('zoneAdmin.drawFirst', 'Draw a polygon first') });
          return;
        }
        await createZone({
          fairId: selectedFairId,
          name: formData.name.trim(),
          type: formData.type,
          geometry: pendingGeometry,
          descriptionAz: formData.descriptionAz || null,
          descriptionEn: formData.descriptionEn || null,
        });
        setMessage({ type: 'success', text: t('zoneAdmin.created', 'Zone created') });
      }
      drawRef.current?.deleteAll();
      setPendingGeometry(null);
      setEditingZone(null);
      setFormData({ name: '', type: 'food', descriptionAz: '', descriptionEn: '' });
      loadZones();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || t('zoneAdmin.saveFailed', 'Save failed');
      setMessage({ type: 'error', text: msg });
    }
  };

  const handleEdit = (zone: MapZone) => {
    setEditingZone(zone);
    setPendingGeometry(null);
    drawRef.current?.deleteAll();
    setFormData({
      name: zone.name,
      type: zone.type,
      descriptionAz: zone.descriptionAz || '',
      descriptionEn: zone.descriptionEn || '',
    });
    // Fly to the zone so the admin can see what they're editing.
    try {
      const geom = JSON.parse(zone.geometry);
      if (geom.coordinates?.[0]?.[0]) {
        const [lng, lat] = geom.coordinates[0][0];
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 18 });
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (zone: MapZone) => {
    if (!window.confirm(t('zoneAdmin.confirmDelete', `Delete zone "${zone.name}"?`))) return;
    try {
      await deleteZone(zone.id);
      setMessage({ type: 'success', text: t('zoneAdmin.deleted', 'Zone deleted') });
      loadZones();
    } catch {
      setMessage({ type: 'error', text: t('zoneAdmin.deleteFailed', 'Delete failed') });
    }
  };

  const handleToggleVisibility = async (zone: MapZone) => {
    try {
      await updateZone(zone.id, { isVisible: !zone.isVisible });
      loadZones();
    } catch {
      setMessage({ type: 'error', text: t('zoneAdmin.toggleFailed', 'Could not change visibility') });
    }
  };

  const isFormOpen = pendingGeometry !== null || editingZone !== null;

  return (
    <div className="zone-mgmt">
      <div className="zone-mgmt-header">
        <div>
          <h2>{t('zoneAdmin.title', 'Map zones')}</h2>
          <p className="lede">
            {t('zoneAdmin.subtitle', 'Outline food courts, kids zones, VIP areas, and other regions for visitors to discover on the fair map.')}
          </p>
        </div>
        <div className="zone-mgmt-controls">
          <label className="zone-fair-picker">
            <span>{t('zoneAdmin.fair', 'Fair')}</span>
            <select value={selectedFairId} onChange={(e) => setSelectedFairId(e.target.value)}>
              <option value="">{t('zoneAdmin.pickFair', '— pick a fair —')}</option>
              {fairs.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>
          <button
            className="zone-btn primary"
            onClick={handleStartDraw}
            disabled={!selectedFairId}
          >
            + {t('zoneAdmin.drawNew', 'Draw new zone')}
          </button>
        </div>
      </div>

      {message && (
        <div className={`zone-toast ${message.type}`}>{message.text}</div>
      )}

      <div className="zone-mgmt-body">
        <aside className="zone-list-pane">
          <h3>{t('zoneAdmin.listTitle', 'Existing zones')}</h3>
          {loading ? (
            <div className="zone-empty">{t('common.loading', 'Loading...')}</div>
          ) : zones.length === 0 ? (
            <div className="zone-empty">{t('zoneAdmin.empty', 'No zones yet. Pick a fair and draw your first one.')}</div>
          ) : (
            <ul className="zone-list">
              {zones.map((z) => {
                const preset = ZONE_PRESETS[z.type];
                return (
                  <li key={z.id} className={`zone-card ${z.isVisible ? '' : 'is-hidden'}`}>
                    <div className="zone-card-head">
                      <span className="zone-swatch" style={{ background: preset?.color || z.color }} aria-hidden="true">
                        {preset?.emoji || '📍'}
                      </span>
                      <div className="zone-card-text">
                        <div className="zone-card-name">{z.name}</div>
                        <div className="zone-card-type">{t(`zoneAdmin.type.${z.type}`, z.type)}</div>
                      </div>
                    </div>
                    <div className="zone-card-actions">
                      <button onClick={() => handleEdit(z)} className="zone-btn ghost">
                        {t('common.edit', 'Edit')}
                      </button>
                      <button onClick={() => handleToggleVisibility(z)} className="zone-btn ghost">
                        {z.isVisible
                          ? t('zoneAdmin.hide', 'Hide')
                          : t('zoneAdmin.show', 'Show')}
                      </button>
                      <button onClick={() => handleDelete(z)} className="zone-btn danger">
                        {t('common.delete', 'Delete')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="zone-map-pane">
          <div ref={mapContainerRef} className="zone-map-root" />
          {pendingGeometry && !editingZone && (
            <div className="zone-banner">
              {t('zoneAdmin.polygonReady', 'Polygon captured. Fill in the form and save.')}
            </div>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="zone-form-overlay" role="dialog" aria-modal="true">
          <div className="zone-form">
            <h3>
              {editingZone
                ? t('zoneAdmin.editTitle', 'Edit zone')
                : t('zoneAdmin.createTitle', 'New zone')}
            </h3>
            <label className="zone-field">
              <span>{t('zoneAdmin.fieldName', 'Name')}</span>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('zoneAdmin.namePlaceholder', 'e.g. Food court')}
              />
            </label>
            <label className="zone-field">
              <span>{t('zoneAdmin.fieldType', 'Type')}</span>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ZoneType })}
              >
                {ZONE_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {ZONE_PRESETS[tp].emoji} {t(`zoneAdmin.type.${tp}`, tp)}
                  </option>
                ))}
              </select>
            </label>
            <label className="zone-field">
              <span>{t('zoneAdmin.fieldDescAz', 'Description (Azerbaijani)')}</span>
              <textarea
                rows={2}
                value={formData.descriptionAz}
                onChange={(e) => setFormData({ ...formData, descriptionAz: e.target.value })}
              />
            </label>
            <label className="zone-field">
              <span>{t('zoneAdmin.fieldDescEn', 'Description (English)')}</span>
              <textarea
                rows={2}
                value={formData.descriptionEn}
                onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
              />
            </label>
            <div className="zone-form-actions">
              <button className="zone-btn ghost" onClick={handleCancelPending}>
                {t('common.cancel', 'Cancel')}
              </button>
              <button className="zone-btn primary" onClick={handleSubmit}>
                {editingZone ? t('common.save', 'Save') : t('zoneAdmin.create', 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoneManagement;
