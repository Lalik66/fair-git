import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { publicApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './MapPage.css';

// Set Mapbox access token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN || '';

interface VendorHouse {
  id: string;
  houseNumber: string;
  areaSqm: number;
  price: number;
  description: string;
  latitude: number;
  longitude: number;
  panorama360Url: string | null;
  isAvailable: boolean | null;
}

interface Facility {
  id: string;
  name: string;
  type: string;
  description: string | null;
  latitude: number;
  longitude: number;
  photoUrl: string | null;
  icon: string | null;
  color: string | null;
}

interface Fair {
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

const MapPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [fairs, setFairs] = useState<Fair[]>([]);
  const [selectedFairId, setSelectedFairId] = useState<string>('');
  const [vendorHouses, setVendorHouses] = useState<VendorHouse[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedHouse, _setSelectedHouse] = useState<VendorHouse | null>(null);

  // Default map center (Baku, Azerbaijan)
  const defaultCenter: [number, number] = [49.8671, 40.4093];
  const defaultZoom = 15;

  // Load fairs on mount
  useEffect(() => {
    const loadFairs = async () => {
      try {
        const data = await publicApi.getFairs();
        setFairs(data.fairs || []);

        // Get fair ID from URL or use first fair
        const urlFairId = searchParams.get('fairId');
        if (urlFairId && data.fairs?.some((f: Fair) => f.id === urlFairId)) {
          setSelectedFairId(urlFairId);
        } else if (data.fairs?.length > 0) {
          setSelectedFairId(data.fairs[0].id);
        }
      } catch (err) {
        console.error('Failed to load fairs:', err);
        setError(t('map.errorLoadingFairs', 'Failed to load fairs'));
      }
    };
    loadFairs();
  }, []);

  // Load vendor houses and facilities when fair is selected
  useEffect(() => {
    const loadMapData = async () => {
      setLoading(true);
      try {
        const [housesData, facilitiesData] = await Promise.all([
          publicApi.getVendorHouses(selectedFairId || undefined),
          publicApi.getFacilities(),
        ]);
        setVendorHouses(housesData.houses || []);
        setFacilities(facilitiesData.facilities || []);
        setError(null);
      } catch (err) {
        console.error('Failed to load map data:', err);
        setError(t('map.errorLoadingData', 'Failed to load map data'));
      } finally {
        setLoading(false);
      }
    };
    loadMapData();
  }, [selectedFairId, t]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const selectedFair = fairs.find(f => f.id === selectedFairId);
    const center: [number, number] = selectedFair?.mapCenterLat && selectedFair?.mapCenterLng
      ? [selectedFair.mapCenterLng, selectedFair.mapCenterLat]
      : defaultCenter;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: defaultZoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [fairs]);

  // Update map center when fair changes
  useEffect(() => {
    if (!map.current) return;

    const selectedFair = fairs.find(f => f.id === selectedFairId);
    if (selectedFair?.mapCenterLat && selectedFair?.mapCenterLng) {
      map.current.flyTo({
        center: [selectedFair.mapCenterLng, selectedFair.mapCenterLat],
        zoom: defaultZoom,
      });
    }
  }, [selectedFairId, fairs]);

  // Update markers when data changes
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add vendor house markers
    vendorHouses.forEach(house => {
      if (!house.latitude || !house.longitude) return;

      const isAvailable = house.isAvailable !== false;
      const markerColor = house.isAvailable === null
        ? '#3B82F6' // Blue if no fair selected
        : isAvailable
          ? '#10B981' // Green for available
          : '#EF4444'; // Red for occupied

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'map-marker vendor-house-marker';
      el.style.backgroundColor = markerColor;
      el.innerHTML = `<span class="marker-icon">🏠</span>`;
      el.title = house.houseNumber;

      // Create popup content
      const popupContent = `
        <div class="marker-popup vendor-popup">
          <h3>${house.houseNumber}</h3>
          <p class="status ${isAvailable ? 'available' : 'occupied'}">
            ${house.isAvailable === null
              ? t('map.selectFair', 'Select a fair to see availability')
              : isAvailable
                ? t('map.available', 'Available')
                : t('map.occupied', 'Occupied')
            }
          </p>
          <div class="house-details">
            <p><strong>${t('map.area', 'Area')}:</strong> ${house.areaSqm?.toFixed(1)} m²</p>
            <p><strong>${t('map.price', 'Price')}:</strong> ${house.price?.toFixed(2)} AZN</p>
            ${house.description ? `<p>${house.description}</p>` : ''}
          </div>
          ${house.panorama360Url ? `
            <button class="btn btn-sm btn-panorama" onclick="window.dispatchEvent(new CustomEvent('openPanorama', { detail: '${house.id}' }))">
              ${t('map.view360', 'View 360°')}
            </button>
          ` : ''}
          ${isAvailable && user?.role === 'vendor' ? `
            <button class="btn btn-sm btn-primary" onclick="window.dispatchEvent(new CustomEvent('applyForHouse', { detail: '${house.id}' }))">
              ${t('map.applyNow', 'Apply Now')}
            </button>
          ` : ''}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([house.longitude, house.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Add facility markers
    facilities.forEach(facility => {
      if (!facility.latitude || !facility.longitude) return;

      const facilityIcon = getFacilityIcon(facility.type);
      const facilityColor = facility.color || getFacilityColor(facility.type);

      const el = document.createElement('div');
      el.className = 'map-marker facility-marker';
      el.style.backgroundColor = facilityColor;
      el.innerHTML = `<span class="marker-icon">${facilityIcon}</span>`;
      el.title = facility.name;

      const popupContent = `
        <div class="marker-popup facility-popup">
          <h3>${facilityIcon} ${facility.name}</h3>
          <p class="facility-type">${t(`facility.${facility.type}`, facility.type)}</p>
          ${facility.description ? `<p>${facility.description}</p>` : ''}
          ${facility.photoUrl ? `<img src="${facility.photoUrl}" alt="${facility.name}" class="facility-photo" />` : ''}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([facility.longitude, facility.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [vendorHouses, facilities, user, t]);

  // Handle fair selection change
  const handleFairChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFairId = e.target.value;
    setSelectedFairId(newFairId);
    if (newFairId) {
      setSearchParams({ fairId: newFairId });
    } else {
      setSearchParams({});
    }
  };

  // Get icon for facility type
  const getFacilityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      restaurant: '🍽️',
      cafe: '☕',
      kids_zone: '🎠',
      restroom: '🚻',
      taxi: '🚕',
      bus_stop: '🚌',
      parking: '🅿️',
      info: 'ℹ️',
      first_aid: '🏥',
      atm: '🏧',
    };
    return icons[type] || '📍';
  };

  // Get color for facility type
  const getFacilityColor = (type: string): string => {
    const colors: Record<string, string> = {
      restaurant: '#F59E0B',
      cafe: '#8B5CF6',
      kids_zone: '#EC4899',
      restroom: '#6366F1',
      taxi: '#FBBF24',
      bus_stop: '#3B82F6',
      parking: '#6B7280',
      info: '#10B981',
      first_aid: '#EF4444',
      atm: '#059669',
    };
    return colors[type] || '#6B7280';
  };

  const selectedFair = fairs.find(f => f.id === selectedFairId);

  return (
    <div className="map-page">
      <div className="map-header">
        <h1>{t('map.title', 'Fair Map')}</h1>
        <div className="map-controls">
          <select
            className="fair-selector"
            value={selectedFairId}
            onChange={handleFairChange}
            aria-label={t('map.selectFairLabel', 'Select Fair')}
          >
            <option value="">{t('map.allFairs', 'All Fairs')}</option>
            {fairs.map(fair => (
              <option key={fair.id} value={fair.id}>
                {fair.name} ({fair.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedFair && (
        <div className="fair-info">
          <h2>{selectedFair.name}</h2>
          <p className="fair-dates">
            {new Date(selectedFair.startDate).toLocaleDateString(i18n.language)} - {new Date(selectedFair.endDate).toLocaleDateString(i18n.language)}
          </p>
          {selectedFair.locationAddress && (
            <p className="fair-location">📍 {selectedFair.locationAddress}</p>
          )}
        </div>
      )}

      {error && (
        <div className="map-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            {t('common.retry', 'Retry')}
          </button>
        </div>
      )}

      <div className="map-container-wrapper">
        {loading && (
          <div className="map-loading">
            <div className="spinner"></div>
            <p>{t('map.loading', 'Loading map...')}</p>
          </div>
        )}
        <div ref={mapContainer} className="map-container" />
      </div>

      <div className="map-legend">
        <h3>{t('map.legend', 'Legend')}</h3>
        <div className="legend-items">
          <div className="legend-section">
            <h4>{t('map.vendorHouses', 'Vendor Houses')}</h4>
            <div className="legend-item">
              <span className="legend-marker" style={{ backgroundColor: '#10B981' }}>🏠</span>
              <span>{t('map.available', 'Available')}</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker" style={{ backgroundColor: '#EF4444' }}>🏠</span>
              <span>{t('map.occupied', 'Occupied')}</span>
            </div>
          </div>
          <div className="legend-section">
            <h4>{t('map.facilities', 'Facilities')}</h4>
            <div className="legend-item">
              <span className="legend-marker" style={{ backgroundColor: '#F59E0B' }}>🍽️</span>
              <span>{t('facility.restaurant', 'Restaurant')}</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker" style={{ backgroundColor: '#8B5CF6' }}>☕</span>
              <span>{t('facility.cafe', 'Cafe')}</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker" style={{ backgroundColor: '#EC4899' }}>🎠</span>
              <span>{t('facility.kids_zone', 'Kids Zone')}</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker" style={{ backgroundColor: '#6366F1' }}>🚻</span>
              <span>{t('facility.restroom', 'Restroom')}</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker" style={{ backgroundColor: '#6B7280' }}>🅿️</span>
              <span>{t('facility.parking', 'Parking')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
