import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { distance, point } from '@turf/turf';
import { MapObject, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, getColorForType, getEmojiForType } from '../../types/map';
import type { FriendLocation } from '../../services/friendsService';
import { getAvatarLetter, getAvatarColor, getAvatarAnimationDelay } from '../../utils/avatarHelpers';

// Set Mapbox access token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN || '';

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
}, ref) => {
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
  }, []);

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
      const availabilityClass = obj.isAvailable === null
        ? ''
        : obj.isAvailable
          ? 'available'
          : 'occupied';

      const availabilityText = obj.isAvailable === null
        ? ''
        : obj.isAvailable
          ? '<span class="status available">Bos</span>'
          : '<span class="status occupied">Tutulub</span>';

      return `
        <div class="marker-popup vendor-popup">
          <h3>${obj.emoji} ${obj.label}</h3>
          ${availabilityText}
          <div class="house-details">
            ${obj.areaSqm ? `<p><strong>Sahe:</strong> ${obj.areaSqm.toFixed(1)} m²</p>` : ''}
            ${obj.price ? `<p><strong>Qiymət:</strong> ${obj.price.toFixed(2)} AZN</p>` : ''}
            ${obj.description ? `<p>${obj.description}</p>` : ''}
          </div>
          <button class="btn btn-sm btn-panorama" onclick="window.dispatchEvent(new CustomEvent('openPanorama', { detail: '${obj.id}' }))">
            360° Bax${!obj.panorama360Url ? ' (Demo)' : ''}
          </button>
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
  }, []);

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

      // For vendor houses, color based on availability
      if (isVendorHouse) {
        markerColor = obj.isAvailable === null
          ? '#3B82F6' // Blue if no fair selected
          : obj.isAvailable
            ? '#10B981' // Green for available
            : '#EF4444'; // Red for occupied
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
  }, [objects, createPopupContent, onObjectSelect]);

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
    let distanceText = 'Distance unknown';
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
        staleWarning = `<p class="location-stale-warning">⚠️ Last seen ${minutesAgo} min ago</p>`;
      }
    }

    // Button is disabled if no valid user location
    const buttonDisabled = !hasValidDistance ? 'disabled' : '';
    const buttonTitle = !hasValidDistance ? 'Enable location to get directions' : `Get directions to ${escapedName}`;

    return `
      <div class="marker-popup friend-popup">
        <h3>👤 ${escapedName}</h3>
        <p class="friend-distance">📍 ${distanceText}</p>
        ${staleWarning}
        ${updatedAt ? `<p class="location-time">Son yeniləmə: ${updatedAt}</p>` : ''}
        <button
          class="btn btn-primary get-directions-btn"
          data-action="get-directions"
          data-friend-id="${escapeHTML(friend.id)}"
          ${buttonDisabled}
          title="${buttonTitle}"
        >
          🚶 Get Directions
        </button>
      </div>
    `;
  }, [userLocation, escapeHTML, formatDistance]);

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

  // Event delegation for Get Directions button clicks in friend popups
  useEffect(() => {
    const container = mapContainer.current;
    if (!container || !onGetDirections) return;

    const handlePopupClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-action="get-directions"]') as HTMLButtonElement | null;
      if (btn && !btn.hasAttribute('disabled')) {
        const friendId = btn.getAttribute('data-friend-id');
        if (friendId) onGetDirections(friendId);
      }
    };

    container.addEventListener('click', handlePopupClick);
    return () => container.removeEventListener('click', handlePopupClick);
  }, [onGetDirections]);

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
