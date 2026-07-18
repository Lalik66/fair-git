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

// Public business identity of the vendor occupying a house. Contact details
// are intentionally never included.
export interface VendorInfo {
  // Vendor-profile id + cached review aggregates: powers the reviews modal
  // and the star badge in the house popup.
  vendorProfileId: string;
  avgRating: number;
  reviewCount: number;
  companyName: string | null;
  productCategory: string | null;
  businessDescription: string | null;
  logoUrl: string | null;
  productImages: string[];
}

export interface MapObject {
  id: string;
  type: string;
  label: string;
  description: string | null;
  latitude: number;
  longitude: number;
  color: string;
  emoji: string;
  // Operational fields: present only for privileged viewers (vendor/admin).
  // The backend omits them (sends null) for regular visitors.
  isAvailable?: boolean | null;
  // Tri-state occupancy (privileged + fair selected). Distinguishes a real
  // booking ("tutulub") from a not-yet-approved application ("müraciət var").
  houseAvailability?: 'free' | 'pending' | 'occupied' | null;
  houseNumber?: string;
  areaSqm?: number | null;
  price?: number | null;
  panorama360Url?: string | null;
  // Public, visitor-facing fields shown to everyone.
  visitorStory?: string | null;
  vendor?: VendorInfo | null;
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

// Product-category presentation for vendor houses. Regular visitors see
// houses colored by what the occupying vendor sells (instead of the
// occupancy red/green, which would leak operational status).
export const CATEGORY_META: Record<string, { color: string; emoji: string; labelAz: string; labelEn: string }> = {
  food_beverages: { color: '#f97316', emoji: '🍔', labelAz: 'Yemək və içki', labelEn: 'Food & drink' },
  handicrafts: { color: '#a855f7', emoji: '🧵', labelAz: 'Əl işləri', labelEn: 'Handicrafts' },
  clothing: { color: '#ec4899', emoji: '👕', labelAz: 'Geyim', labelEn: 'Clothing' },
  accessories: { color: '#0ea5e9', emoji: '💍', labelAz: 'Aksesuarlar', labelEn: 'Accessories' },
  other: { color: '#14b8a6', emoji: '🛍️', labelAz: 'Digər', labelEn: 'Other' },
};

// Neutral brand color for a vendor house with no known product category
// (e.g. vacant, or vendor hasn't set one). Deliberately not red/green so it
// carries no occupancy meaning.
export const VENDOR_HOUSE_NEUTRAL_COLOR = '#6366F1';

export function getCategoryColor(productCategory: string | null | undefined): string {
  if (productCategory && CATEGORY_META[productCategory]) {
    return CATEGORY_META[productCategory].color;
  }
  return VENDOR_HOUSE_NEUTRAL_COLOR;
}

export function getCategoryLabel(productCategory: string | null | undefined, language: string): string {
  if (productCategory && CATEGORY_META[productCategory]) {
    const meta = CATEGORY_META[productCategory];
    return language === 'en' ? meta.labelEn : meta.labelAz;
  }
  return '';
}

export function getCategoryEmoji(productCategory: string | null | undefined): string {
  if (productCategory && CATEGORY_META[productCategory]) {
    return CATEGORY_META[productCategory].emoji;
  }
  return '';
}

// Default map center (Baku, Azerbaijan - Yarmarka location)
export const DEFAULT_MAP_CENTER: [number, number] = [49.83690275228737, 40.37094989291927];
export const DEFAULT_MAP_ZOOM = 18;

// Demo panorama URL - used as fallback when no real 360° image is available
// To replace: upload a new image via Admin => Map Management, or replace frontend/public/fevvareler.jpg
export const DEMO_PANORAMA_URL = '/fevvareler.jpg';
