// Map types and constants for split-view map layout

export type FilterType =
  | 'all'
  | 'vendor_house'
  | 'restaurant'
  | 'cafe'
  | 'restroom'
  | 'entrance'
  | 'kids_zone'
  | 'bus_stop'
  | 'parking'
  | 'taxi';

export type ColorCategory = 'green' | 'orange' | 'blue' | 'purple' | 'gray';

export interface MapObject {
  id: string;
  type: string;
  label: string;
  description: string | null;
  latitude: number;
  longitude: number;
  color: string;
  emoji: string;
  isAvailable?: boolean | null;
  houseNumber?: string;
  areaSqm?: number | null;
  price?: number | null;
  panorama360Url?: string | null;
  photoUrl?: string | null;
}

export interface MapObjectsResponse {
  objects: MapObject[];
  count: number;
  fairId: string | null;
}

export interface Fair {
  id: string;
  name: string;
  descriptionAz: string | null;
  descriptionEn: string | null;
  startDate: string;
  endDate: string;
  locationAddress: string | null;
  status: string;
  mapCenterLat: number | null;
  mapCenterLng: number | null;
}

export interface FilterButton {
  key: FilterType;
  label: string;
  emoji: string;
}

export const FILTER_BUTTONS: FilterButton[] = [
  { key: 'all', label: 'Hamisi', emoji: '📍' },
  { key: 'vendor_house', label: 'Evler', emoji: '🏠' },
  { key: 'cafe', label: 'Kafe', emoji: '☕' },
  { key: 'restroom', label: 'WC', emoji: '🚻' },
  { key: 'kids_zone', label: 'Eylenceler', emoji: '🎪' },
  { key: 'bus_stop', label: 'Dayancaq', emoji: '🚌' },
  { key: 'parking', label: 'Parking', emoji: '🅿️' },
];

export const TYPE_COLORS: Record<string, string> = {
  vendor_house: '#22c55e', // green
  restaurant: '#f97316',   // orange
  cafe: '#f97316',         // orange
  restroom: '#3b82f6',     // blue
  info: '#3b82f6',         // blue
  kids_zone: '#a855f7',    // purple
  parking: '#6b7280',      // gray
  bus_stop: '#6b7280',     // gray
  taxi: '#6b7280',         // gray
};

export const TYPE_EMOJIS: Record<string, string> = {
  vendor_house: '🏠',
  restaurant: '🍽️',
  cafe: '☕',
  kids_zone: '🎪',
  restroom: '🚻',
  parking: '🅿️',
  bus_stop: '🚌',
  taxi: '🚕',
  entrance: '🚪',
  info: 'ℹ️',
};

export function getColorForType(type: string): string {
  return TYPE_COLORS[type] || '#6b7280';
}

export function getEmojiForType(type: string): string {
  return TYPE_EMOJIS[type] || '📍';
}

// Default map center (Baku, Azerbaijan - Yarmarka location)
export const DEFAULT_MAP_CENTER: [number, number] = [49.83690275228737, 40.37094989291927];
export const DEFAULT_MAP_ZOOM = 18;

// Demo panorama URL - used as fallback when no real 360° image is available
// To replace: upload a new image via Admin => Map Management, or replace frontend/public/fevvareler.jpg
export const DEMO_PANORAMA_URL = '/fevvareler.jpg';
