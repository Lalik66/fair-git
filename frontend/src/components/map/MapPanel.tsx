import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { distance, point } from '@turf/turf';
import { MapObject, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, getColorForType, getEmojiForType, getCategoryColor, getCategoryLabel, getCategoryEmoji } from '../../types/map';
import type { FriendLocation } from '../../services/friendsService';
import { getAvatarLetter, getAvatarColor, getAvatarAnimationDelay } from '../../utils/avatarHelpers';
import { trackVendorClick } from '../../services/analyticsService';

// Set Mapbox access token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN || '';

// Escape text/attribute content before injecting into popup HTML (Mapbox
// setHTML). Covers &, <, >, and both quote styles so it is safe in attributes.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface MapPanelProps {
  objects: MapObject[];
  selectedObjectId: string | null;
  onObjectSelect: (id: string | null) => void;
  mapCenter?: [number, number];
  onGeolocateControlReady?: (control: mapboxgl.GeolocateControl) => void;
  /** Friend locations to display on the map */
  friendLocations?: FriendLocation[];
  className?: string;
  /** User's current location for distance calculations */
  userLocation?: { latitude: number; longitude: number } | null;
  /** Callback when user clicks "Get Directions" on a friend popup */
  onGetDirections?: (friendId: string) => void;
  /** Callback when user clicks "Send Reaction" on a friend popup */
  onSendReaction?: (friendId: string, friendName: string) => void;
  /** Callback when user clicks "Yol göstər" on a vendor-house visitor popup */
  onObjectDirections?: (lat: number, lng: number, name: string) => void;
  /** Callback when map is ready (for parent to get map instance) */
  onMapReady?: (map: mapboxgl.Map) => void;
  /**
   * True for vendor/admin accounts. Privileged viewers see operational data
   * (area, price, occupancy red/green). Regular visitors see the public
   * story: panorama, business identity, category-colored markers.
   */
  isPrivileged?: boolean;
  /**
   * House-picker mode for the vendor application form. Vendor-house popups
   * show a "Seç" button on free houses and an "occupied" label otherwise.
   */
  selectionMode?: boolean;
  /** Called when a free house is picked in selectionMode. */
  onHouseSelect?: (houseId: string, houseNumber: string) => void;
}

export interface MapPanelRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  getMap: () => mapboxgl.Map | null;
}

const MapPanel = forwardRef<MapPanelRef, MapPanelProps>(({
  objects,
  selectedObjectId,
  onObjectSelect,
  mapCenter,
  onGeolocateControlReady,
  friendLocations = [],
  className = '',
  userLocation,
  onGetDirections,
  onSendReaction,
  onObjectDirections,
  onMapReady,
  isPrivileged = false,
  selectionMode = false,
  onHouseSelect,
}, ref) => {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);
  // Separate ref for friend markers to manage them independently
  const friendMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const center = mapCenter || DEFAULT_MAP_CENTER;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: DEFAULT_MAP_ZOOM,
    });

    // Ensure zoom is applied after the map style loads and container has dimensions
    map.current.once('load', () => {
      map.current?.setZoom(DEFAULT_MAP_ZOOM);
      map.current?.resize();
      if (onMapReady && map.current) {
        onMapReady(map.current);
      }
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Add geolocation control
    geolocateControlRef.current = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserLocation: true,
      showUserHeading: true,
      fitBoundsOptions: {
        maxZoom: 16
      }
    });
    map.current.addControl(geolocateControlRef.current, 'top-right');

    // Notify parent that geolocateControl is ready
    if (onGeolocateControlReady) {
      onGeolocateControlReady(geolocateControlRef.current);
    }

    // Handle geolocation errors gracefully
    geolocateControlRef.current.on('error', (error: GeolocationPositionError) => {
      let message = 'Məkanınızı təyin etmək mümkün olmadı.';
      if (error.code === error.PERMISSION_DENIED) {
        message = 'Məkan icazəsi rədd edildi. Brauzer parametrlərindən icazə verin.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        message = 'Məkan məlumatı mövcud deyil.';
      } else if (error.code === error.TIMEOUT) {
        message = 'Məkan sorğusu vaxt aşımına uğradı.';
      }
      console.warn('Geolocation error:', message, error);
    });

    // Close popup and deselect when clicking on map
    map.current.on('click', (e) => {
      // Check if click is on a marker
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.map-marker')) {
        onObjectSelect(null);
      }
    });

    return () => {
      // Clean up friend markers
      friendMarkersRef.current.forEach((marker) => marker.remove());
      friendMarkersRef.current.clear();

      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapReady]);

  // Update map center when it changes
  useEffect(() => {
    if (!map.current || !mapCenter) return;

    map.current.flyTo({
      center: mapCenter,
      zoom: DEFAULT_MAP_ZOOM,
      duration: 1000,
    });
  }, [mapCenter]);

  // Create popup content
  const createPopupContent = useCallback((obj: MapObject): string => {
    const isVendorHouse = obj.type === 'vendor_house';

    if (isVendorHouse) {
      const panoramaBtn = `
          <button class="btn btn-sm btn-panorama" onclick="window.dispatchEvent(new CustomEvent('openPanorama', { detail: '${escapeHtml(obj.id)}' }))">
            360° Bax${!obj.panorama360Url ? ' (Demo)' : ''}
          </button>`;

      // House-picker mode (application form modal). Free houses get a "Seç"
      // button; occupied ones show why they can't be picked. The "Yol göstər"
      // directions button stays so the user can scout the walk first.
      if (selectionMode) {
        const houseLabel = escapeHtml(obj.houseNumber || obj.label);
        // Prefer the tri-state; fall back to the boolean for safety.
        const state =
          obj.houseAvailability ??
          (obj.isAvailable === false ? 'occupied' : 'free');
        const free = state === 'free';
        const story = obj.visitorStory
          ? `<p class="popup-story">${escapeHtml(obj.visitorStory)}</p>`
          : '';
        const occupiedLabel =
          state === 'occupied'
            ? `<p class="house-occupied-label">${escapeHtml(t('vendor.error.houseOccupied'))}</p>`
            : state === 'pending'
              ? `<p class="house-occupied-label">${escapeHtml(t('vendor.error.housePending'))}</p>`
              : '';
        const selectBtn = free
          ? `<button class="btn btn-sm btn-primary btn-select-house" data-action="select-house"
               data-house-id="${escapeHtml(obj.id)}"
               data-house-number="${escapeHtml(obj.houseNumber || obj.label)}">
               ${escapeHtml(t('vendor.map.selectHouse'))}
             </button>`
          : '';
        const directionsLabel = escapeHtml(t('route.showDirection'));
        const directionsBtn = `
          <button class="btn btn-sm btn-directions" data-action="object-directions"
            data-lat="${escapeHtml(String(obj.latitude))}"
            data-lng="${escapeHtml(String(obj.longitude))}"
            data-name="${houseLabel}"
            data-vendor-id="${escapeHtml(obj.id)}"
            aria-label="${directionsLabel}">
            <span aria-hidden="true">📍</span> ${directionsLabel}
          </button>`;
        return `
        <div class="marker-popup vendor-popup selection-popup">
          <h3>🏠 ${houseLabel}</h3>
          ${obj.areaSqm ? `<p><strong>Sahe:</strong> ${obj.areaSqm.toFixed(1)} m²</p>` : ''}
          ${obj.price ? `<p><strong>Qiymət:</strong> ${obj.price.toFixed(2)} AZN</p>` : ''}
          ${story}
          ${occupiedLabel}
          ${selectBtn}
          ${directionsBtn}
          ${panoramaBtn}
        </div>
      `;
      }

      // Vendor/admin: operational popup (area, price, occupancy, internal note).
      if (isPrivileged) {
        // Prefer tri-state so a pending application reads "Müraciət var"
        // instead of the misleading "Tutulub".
        const availState =
          obj.houseAvailability ??
          (obj.isAvailable === null || obj.isAvailable === undefined
            ? null
            : obj.isAvailable
              ? 'free'
              : 'occupied');
        const availabilityText =
          availState === 'free'
            ? '<span class="status available">Bos</span>'
            : availState === 'pending'
              ? '<span class="status pending">Müraciət var</span>'
              : availState === 'occupied'
                ? '<span class="status occupied">Tutulub</span>'
                : '';

        return `
        <div class="marker-popup vendor-popup">
          <h3>${obj.emoji} ${escapeHtml(obj.label)}</h3>
          ${availabilityText}
          <div class="house-details">
            ${obj.areaSqm ? `<p><strong>Sahe:</strong> ${obj.areaSqm.toFixed(1)} m²</p>` : ''}
            ${obj.price ? `<p><strong>Qiymət:</strong> ${obj.price.toFixed(2)} AZN</p>` : ''}
            ${obj.description ? `<p>${escapeHtml(obj.description)}</p>` : ''}
          </div>
          ${panoramaBtn}
        </div>
      `;
      }

      // Regular visitor: the public story — who is here and what it's about.
      // No area / price / occupancy.
      const vendor = obj.vendor;
      const category = vendor?.productCategory;
      const title = escapeHtml(vendor?.companyName || obj.label);
      const headEmoji = getCategoryEmoji(category) || obj.emoji;

      const categoryBadge = category
        ? `<span class="popup-category">${getCategoryEmoji(category)} ${escapeHtml(getCategoryLabel(category, 'az'))}</span>`
        : '';
      const logo = vendor?.logoUrl
        ? `<img src="${escapeHtml(vendor.logoUrl)}" alt="" class="popup-vendor-logo" />`
        : '';
      const about = vendor?.businessDescription
        ? `<p class="popup-about">${escapeHtml(vendor.businessDescription)}</p>`
        : '';
      const story = obj.visitorStory
        ? `<p class="popup-story">${escapeHtml(obj.visitorStory)}</p>`
        : '';
      const images = (vendor?.productImages || [])
        .slice(0, 3)
        .map((src) => `<img src="${escapeHtml(src)}" alt="" class="popup-product-img" />`)
        .join('');
      const imagesRow = images ? `<div class="popup-product-images">${images}</div>` : '';

      const directionsLabel = escapeHtml(t('route.showDirection'));
      const directionsBtn = `
          <button class="btn btn-sm btn-directions" data-action="object-directions"
            data-lat="${escapeHtml(String(obj.latitude))}"
            data-lng="${escapeHtml(String(obj.longitude))}"
            data-name="${escapeHtml(vendor?.companyName || obj.label)}"
            data-vendor-id="${escapeHtml(obj.id)}"
            aria-label="${directionsLabel}">
            <span aria-hidden="true">📍</span> ${directionsLabel}
          </button>`;

      return `
        <div class="marker-popup vendor-popup visitor-popup">
          <h3>${headEmoji} ${title}</h3>
          ${categoryBadge}
          ${logo}
          ${about}
          ${story}
          ${imagesRow}
          ${directionsBtn}
          ${panoramaBtn}
        </div>
      `;
    }

    return `
      <div class="marker-popup facility-popup">
        <h3>${obj.emoji} ${obj.label}</h3>
        <p class="facility-type">${obj.type.replace('_', ' ')}</p>
        ${obj.description ? `<p>${obj.description}</p>` : ''}
        ${obj.photoUrl ? `<img src="${obj.photoUrl}" alt="${obj.label}" class="facility-photo" />` : ''}
      </div>
    `;
  }, [isPrivileged, selectionMode, t]);

  // Update markers when objects change
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    popupsRef.current.clear();

    // Add new markers
    objects.forEach((obj) => {
      if (!obj.latitude || !obj.longitude) return;

      const isVendorHouse = obj.type === 'vendor_house';
      let markerColor = obj.color || getColorForType(obj.type);

      if (isVendorHouse) {
        if (isPrivileged) {
          // Vendor/admin: occupancy status (operational signal). Amber marks
          // a pending application so it reads distinctly from a real booking.
          const st =
            obj.houseAvailability ??
            (obj.isAvailable === null || obj.isAvailable === undefined
              ? null
              : obj.isAvailable
                ? 'free'
                : 'occupied');
          markerColor =
            st === null
              ? '#3B82F6' // Blue if no fair selected
              : st === 'free'
                ? '#10B981' // Green for available
                : st === 'pending'
                  ? '#F59E0B' // Amber for pending application
                  : '#EF4444'; // Red for occupied/rented
        } else {
          // Regular visitor: color by what the stall sells, not occupancy.
          markerColor = getCategoryColor(obj.vendor?.productCategory);
        }
      }

      // Create custom marker element
      const el = document.createElement('div');
      el.className = `map-marker ${isVendorHouse ? 'vendor-house-marker' : 'facility-marker'}`;
      el.style.backgroundColor = markerColor;
      el.innerHTML = `<span class="marker-icon">${obj.emoji || getEmojiForType(obj.type)}</span>`;
      el.title = obj.label;

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25, closeOnClick: false })
        .setHTML(createPopupContent(obj));

      // Analytics: count popup opens on vendor houses only (facilities are
      // not part of the vendor-engagement metric).
      if (isVendorHouse) {
        popup.on('open', () => trackVendorClick(obj.id, 'popup_open'));
      }

      // Create marker
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([obj.longitude, obj.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Handle marker click
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onObjectSelect(obj.id);
      });

      markersRef.current.set(obj.id, marker);
      popupsRef.current.set(obj.id, popup);
    });
  }, [objects, createPopupContent, onObjectSelect, isPrivileged]);

  // Helper function to escape HTML for XSS prevention
  const escapeHTML = useCallback((str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }, []);

  // Helper function to format distance
  const formatDistance = useCallback((distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m away`;
    }
    return `${distanceKm.toFixed(1)} km away`;
  }, []);

  // Helper function to create friend popup content
  const createFriendPopupContent = useCallback((friend: FriendLocation): string => {
    const escapedName = escapeHTML(friend.name);
    const updatedAt = friend.locationUpdatedAt
      ? new Date(friend.locationUpdatedAt).toLocaleTimeString()
      : '';

    // Calculate distance from user to friend
    let distanceText = t('friends.card.distanceUnknown');
    let hasValidDistance = false;
    if (userLocation) {
      const userPoint = point([userLocation.longitude, userLocation.latitude]);
      const friendPoint = point([friend.lastLongitude, friend.lastLatitude]);
      const distanceKm = distance(userPoint, friendPoint, { units: 'kilometers' });
      distanceText = formatDistance(distanceKm);
      hasValidDistance = true;
    }

    // Check if location is stale (> 30 minutes old)
    let staleWarning = '';
    if (friend.locationUpdatedAt) {
      const updatedAtDate = new Date(friend.locationUpdatedAt);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - updatedAtDate.getTime()) / (1000 * 60));
      if (minutesAgo > 30) {
        staleWarning = `<p class="location-stale-warning">⚠️ ${t('friends.card.lastSeen', { time: `${minutesAgo} min` })}</p>`;
      }
    }

    // Button is disabled if no valid user location
    const buttonDisabled = !hasValidDistance ? 'disabled' : '';
    const buttonTitle = !hasValidDistance ? t('route.enableLocationForDirections') : `${t('route.getDirections')} - ${escapedName}`;

    return `
      <div class="marker-popup friend-popup">
        <h3>👤 ${escapedName}</h3>
        <p class="friend-distance">📍 ${distanceText}</p>
        ${staleWarning}
        ${updatedAt ? `<p class="location-time">Son yeniləmə: ${updatedAt}</p>` : ''}
        <div class="friend-popup-actions">
          <button
            class="btn btn-primary get-directions-btn"
            data-action="get-directions"
            data-friend-id="${escapeHTML(friend.id)}"
            ${buttonDisabled}
            title="${buttonTitle}"
          >
            🚶 Get Directions
          </button>
          <button
            class="btn btn-reaction send-reaction-btn"
            data-action="send-reaction"
            data-friend-id="${escapeHTML(friend.id)}"
            data-friend-name="${escapedName}"
            title="${t('reactions.sendReaction')}"
          >
            😊 ${t('reactions.sendReaction')}
          </button>
        </div>
      </div>
    `;
  }, [userLocation, escapeHTML, formatDistance, t]);

  // Update friend markers efficiently (add/update/remove without recreating all)
  useEffect(() => {
    if (!map.current) return;

    const currentFriendIds = new Set(friendLocations.map((f) => f.id));
    const existingFriendIds = new Set(friendMarkersRef.current.keys());

    // Remove markers for friends no longer in the list
    existingFriendIds.forEach((id) => {
      if (!currentFriendIds.has(id)) {
        const marker = friendMarkersRef.current.get(id);
        if (marker) {
          marker.remove();
          friendMarkersRef.current.delete(id);
        }
      }
    });

    // Add or update friend markers
    friendLocations.forEach((friend) => {
      const existingMarker = friendMarkersRef.current.get(friend.id);

      if (existingMarker) {
        // Update existing marker position
        existingMarker.setLngLat([friend.lastLongitude, friend.lastLatitude]);
        // Update popup content
        const popup = existingMarker.getPopup();
        if (popup) {
          popup.setHTML(createFriendPopupContent(friend));
        }
      } else {
        // Create new marker for this friend with letter avatar
        const avatarColor = getAvatarColor(friend.name);
        const avatarLetter = getAvatarLetter(friend.name);
        const animationDelay = getAvatarAnimationDelay(friend.name);

        const el = document.createElement('div');
        el.className = 'map-marker friend-marker';
        el.style.backgroundColor = avatarColor;
        // Do NOT set borderColor — CSS uses white border for contrast
        el.style.color = '#FFFFFF';
        el.style.fontWeight = '700';
        el.style.fontSize = '16px';
        el.style.fontFamily = 'Poppins, sans-serif';
        // Inner wrapper for animation - outer div must NOT have transform so Mapbox can position it
        el.innerHTML = `<div class="friend-marker-inner" style="animation-delay: ${animationDelay}s"><span class="marker-icon marker-letter">${avatarLetter}</span></div>`;
        el.title = friend.name;

        const popup = new mapboxgl.Popup({ offset: 25, closeOnClick: true })
          .setHTML(createFriendPopupContent(friend));

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([friend.lastLongitude, friend.lastLatitude])
          .setPopup(popup)
          .addTo(map.current!);

        friendMarkersRef.current.set(friend.id, marker);
      }
    });
  }, [friendLocations, createFriendPopupContent]);

  // Event delegation for Get Directions and Send Reaction button clicks in friend popups
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    const handlePopupClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Handle "Yol göstər" on a vendor-house visitor popup. Distinct action
      // from the friend "get-directions" so the two never collide.
      const objectBtn = target.closest('[data-action="object-directions"]') as HTMLButtonElement | null;
      if (objectBtn && !objectBtn.hasAttribute('disabled') && onObjectDirections) {
        const lat = parseFloat(objectBtn.getAttribute('data-lat') || '');
        const lng = parseFloat(objectBtn.getAttribute('data-lng') || '');
        const name = objectBtn.getAttribute('data-name') || '';
        // Vendor-only — facilities don't carry data-vendor-id and aren't counted.
        const vendorId = objectBtn.getAttribute('data-vendor-id');
        if (vendorId) trackVendorClick(vendorId, 'directions');
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) onObjectDirections(lat, lng, name);
        return;
      }

      // Handle "Seç" (select house) in the application form picker modal.
      const selectBtn = target.closest('[data-action="select-house"]') as HTMLButtonElement | null;
      if (selectBtn && onHouseSelect) {
        const houseId = selectBtn.getAttribute('data-house-id') || '';
        const houseNumber = selectBtn.getAttribute('data-house-number') || '';
        if (houseId && houseNumber) onHouseSelect(houseId, houseNumber);
        return;
      }

      // Handle Get Directions
      const directionsBtn = target.closest('[data-action="get-directions"]') as HTMLButtonElement | null;
      if (directionsBtn && !directionsBtn.hasAttribute('disabled') && onGetDirections) {
        const friendId = directionsBtn.getAttribute('data-friend-id');
        if (friendId) onGetDirections(friendId);
        return;
      }

      // Handle Send Reaction
      const reactionBtn = target.closest('[data-action="send-reaction"]') as HTMLButtonElement | null;
      if (reactionBtn && onSendReaction) {
        const friendId = reactionBtn.getAttribute('data-friend-id');
        const friendName = reactionBtn.getAttribute('data-friend-name');
        if (friendId && friendName) onSendReaction(friendId, friendName);
      }
    };

    container.addEventListener('click', handlePopupClick);
    return () => container.removeEventListener('click', handlePopupClick);
  }, [onGetDirections, onSendReaction, onObjectDirections, onHouseSelect]);

  // Handle selection changes - fly to object and open popup
  useEffect(() => {
    if (!map.current) return;

    // Close all popups first
    popupsRef.current.forEach((popup) => {
      if (popup.isOpen()) {
        popup.remove();
      }
    });

    if (selectedObjectId) {
      const marker = markersRef.current.get(selectedObjectId);
      const popup = popupsRef.current.get(selectedObjectId);
      const obj = objects.find(o => o.id === selectedObjectId);

      if (marker && obj) {
        // Fly to the selected object
        map.current.flyTo({
          center: [obj.longitude, obj.latitude],
          zoom: Math.max(map.current.getZoom(), 17),
          duration: 800,
        });

        // Open the popup after flyTo animation
        setTimeout(() => {
          if (popup && !popup.isOpen()) {
            marker.togglePopup();
          }
        }, 850);
      }
    }
  }, [selectedObjectId, objects]);

  // Expose flyTo and getMap methods for external use via ref
  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number, zoom?: number) => {
      if (!map.current) return;
      map.current.flyTo({
        center: [lng, lat],
        zoom: zoom || 17,
        duration: 1000,
      });
    },
    getMap: () => map.current,
  }), []);

  return (
    <div className={`map-panel ${className}`}>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
});

MapPanel.displayName = 'MapPanel';

export default MapPanel;
