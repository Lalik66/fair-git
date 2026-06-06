import api from './api';

export type ZoneType = 'food' | 'kids' | 'vip' | 'craft' | 'stage' | 'info' | 'other';

export const ZONE_PRESETS: Record<ZoneType, { color: string; emoji: string }> = {
  food:  { color: '#F59E0B', emoji: '🍽️' },
  kids:  { color: '#EC4899', emoji: '🎠' },
  vip:   { color: '#8B5CF6', emoji: '⭐' },
  craft: { color: '#14B8A6', emoji: '🎨' },
  stage: { color: '#EF4444', emoji: '🎤' },
  info:  { color: '#10B981', emoji: 'ℹ️' },
  other: { color: '#6B7280', emoji: '📍' },
};

/**
 * Polygon GeoJSON we expect to round-trip with the backend. We keep the
 * geometry as the raw string the backend returns and parse on demand inside
 * the map layer, so the React layer doesn't have to re-encode on every prop
 * change.
 */
export interface MapZone {
  id: string;
  name: string;
  type: ZoneType;
  color: string;
  opacity: number;
  descriptionAz: string | null;
  descriptionEn: string | null;
  /** Stringified GeoJSON Polygon. */
  geometry: string;
  isVisible?: boolean;
}

export async function getZones(fairId: string): Promise<MapZone[]> {
  if (!fairId) return [];
  const res = await api.get<{ zones: MapZone[] }>('/zones', {
    params: { fairId },
  });
  return res.data.zones;
}

export async function getZonesAdmin(fairId: string): Promise<MapZone[]> {
  const res = await api.get<{ zones: MapZone[] }>('/zones/admin', {
    params: { fairId },
  });
  return res.data.zones;
}

export interface CreateZoneInput {
  fairId: string;
  name: string;
  type: ZoneType;
  geometry: string;
  descriptionAz?: string | null;
  descriptionEn?: string | null;
  opacity?: number;
  isVisible?: boolean;
}

export async function createZone(input: CreateZoneInput): Promise<MapZone> {
  const res = await api.post<{ zone: MapZone }>('/zones', input);
  return res.data.zone;
}

export interface UpdateZoneInput {
  name?: string;
  type?: ZoneType;
  geometry?: string;
  descriptionAz?: string | null;
  descriptionEn?: string | null;
  opacity?: number;
  isVisible?: boolean;
}

export async function updateZone(id: string, input: UpdateZoneInput): Promise<MapZone> {
  const res = await api.patch<{ zone: MapZone }>(`/zones/${id}`, input);
  return res.data.zone;
}

export async function deleteZone(id: string): Promise<void> {
  await api.delete(`/zones/${id}`);
}
