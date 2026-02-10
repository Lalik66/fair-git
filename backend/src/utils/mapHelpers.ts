export type ColorCategory = 'green' | 'orange' | 'blue' | 'purple' | 'gray';

export function getColorCategory(objectType: string): ColorCategory {
  switch (objectType) {
    case 'vendor_house': return 'green';
    case 'restaurant':
    case 'cafe': return 'orange';
    case 'restroom': return 'blue';
    case 'kids_zone': return 'purple';
    case 'parking':
    case 'bus_stop':
    case 'taxi': return 'gray';
    default: return 'gray';
  }
}

export function getEmoji(objectType: string): string {
  switch (objectType) {
    case 'vendor_house': return '🏠';
    case 'restaurant': return '🍽️';
    case 'cafe': return '☕';
    case 'kids_zone': return '🎪';
    case 'restroom': return '🚻';
    case 'parking': return '🅿️';
    case 'bus_stop': return '🚌';
    case 'taxi': return '🚕';
    default: return '📍';
  }
}
