import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapObject, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, getColorForType, getEmojiForType } from '../../types/map';

// Set Mapbox access token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN || '';

interface MapPanelProps {
  objects: MapObject[];
  selectedObjectId: string | null;
  onObjectSelect: (id: string | null) => void;
  mapCenter?: [number, number];
  onGeolocateControlReady?: (control: mapboxgl.GeolocateControl) => void;
  className?: string;
}

export interface MapPanelRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
}

const MapPanel = forwardRef<MapPanelRef, MapPanelProps>(({
  objects,
  selectedObjectId,
  onObjectSelect,
  mapCenter,
  onGeolocateControlReady,
  className = '',
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);

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

  // Expose flyTo method for external use via ref
  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number, zoom?: number) => {
      if (!map.current) return;
      map.current.flyTo({
        center: [lng, lat],
        zoom: zoom || 17,
        duration: 1000,
      });
    },
  }), []);

  return (
    <div className={`map-panel ${className}`}>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
});

MapPanel.displayName = 'MapPanel';

export default MapPanel;
