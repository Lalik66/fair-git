import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { publicApi, vendorApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PanoramaViewer from '../components/PanoramaViewer';
import './MapPage.css';

// Set Mapbox access token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN || '';

interface VendorInfo {
  companyName: string | null;
  productCategory: string | null;
  businessDescription: string | null;
  logoUrl: string | null;
  productImages: string[];
}

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
  vendor: VendorInfo | null;
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
  const [panoramaHouse, setPanoramaHouse] = useState<VendorHouse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [applicationMessage, setApplicationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingApplication, setSubmittingApplication] = useState(false);

  // Product categories for filter
  const productCategories = [
    { value: 'food_beverages', labelKey: 'categories.food_beverages', fallback: 'Food & Beverages' },
    { value: 'handicrafts', labelKey: 'categories.handicrafts', fallback: 'Handicrafts' },
    { value: 'clothing', labelKey: 'categories.clothing', fallback: 'Clothing' },
    { value: 'accessories', labelKey: 'categories.accessories', fallback: 'Accessories' },
    { value: 'other', labelKey: 'categories.other', fallback: 'Other' },
  ];

  // Default map center (Baku, Azerbaijan)
  const defaultCenter: [number, number] = [49.83690275228737, 40.37094989291927];
  const defaultZoom = 17;

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

        // Get category from URL if present
        const urlCategory = searchParams.get('category');
        if (urlCategory) {
          setSelectedCategory(urlCategory);
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

    // Ensure zoom is applied after the map style loads and container has dimensions
    map.current.once('load', () => {
      map.current?.setZoom(defaultZoom);
      map.current?.resize();
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

  // Resize and set zoom when loading completes (container may have gained dimensions)
  useEffect(() => {
    if (!loading && map.current) {
      map.current.resize();
      map.current.setZoom(defaultZoom);
    }
  }, [loading]);

  // Update markers when data changes
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Filter vendor houses by selected category
    const filteredHouses = selectedCategory
      ? vendorHouses.filter(house => {
          // If house has a vendor with a matching category, show it
          if (house.vendor && house.vendor.productCategory === selectedCategory) return true;
          // If no category filter matches and house is available (no vendor), hide it when filtering
          return false;
        })
      : vendorHouses;

    // Add vendor house markers
    filteredHouses.forEach(house => {
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

      // Create popup content with vendor info for occupied houses
      const vendorSection = !isAvailable && house.vendor ? `
        <div class="vendor-info">
          ${house.vendor.logoUrl ? `<img src="${house.vendor.logoUrl}" alt="${house.vendor.companyName || ''}" class="vendor-logo" />` : ''}
          ${house.vendor.companyName ? `<h4 class="vendor-name">${house.vendor.companyName}</h4>` : ''}
          ${house.vendor.productCategory ? `
            <p class="product-category">
              <span class="category-badge">${t(`category.${house.vendor.productCategory}`, house.vendor.productCategory)}</span>
            </p>
          ` : ''}
          ${house.vendor.businessDescription ? `<p class="business-description">${house.vendor.businessDescription}</p>` : ''}
          ${house.vendor.productImages && house.vendor.productImages.length > 0 ? `
            <div class="product-images">
              ${house.vendor.productImages.slice(0, 3).map((img: string) => `<img src="${img}" alt="Product" class="product-image" />`).join('')}
            </div>
          ` : ''}
        </div>
      ` : '';

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
          ${vendorSection}
          <div class="house-details">
            <p><strong>${t('map.area', 'Area')}:</strong> ${house.areaSqm?.toFixed(1)} m²</p>
            <p><strong>${t('map.price', 'Price')}:</strong> ${house.price?.toFixed(2)} AZN</p>
            ${house.description ? `<p>${house.description}</p>` : ''}
          </div>
          <button class="btn btn-sm btn-panorama" onclick="window.dispatchEvent(new CustomEvent('openPanorama', { detail: '${house.id}' }))">
            ${t('map.view360', 'View 360°')}${!house.panorama360Url ? ' (Demo)' : ''}
          </button>
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
  }, [vendorHouses, facilities, user, t, selectedCategory]);

  // Listen for panorama open events from popup buttons
  useEffect(() => {
    const handleOpenPanorama = (e: CustomEvent) => {
      const houseId = e.detail;
      const house = vendorHouses.find(h => h.id === houseId);
      // Allow opening panorama even without URL - demo fallback will be used
      if (house) {
        setPanoramaHouse(house);
      }
    };

    window.addEventListener('openPanorama', handleOpenPanorama as EventListener);
    return () => {
      window.removeEventListener('openPanorama', handleOpenPanorama as EventListener);
    };
  }, [vendorHouses]);

  // Listen for apply-for-house events from popup buttons
  useEffect(() => {
    const handleApplyForHouse = async (e: CustomEvent) => {
      const houseId = e.detail;
      if (!selectedFairId) {
        setApplicationMessage({ type: 'error', text: t('map.selectFairFirst', 'Please select a fair first') });
        return;
      }

      const house = vendorHouses.find(h => h.id === houseId);
      if (!house) return;

      const confirmed = window.confirm(
        t('map.confirmApplication', `Are you sure you want to apply for house ${house.houseNumber} at ${fairs.find(f => f.id === selectedFairId)?.name || 'this fair'}?`)
      );
      if (!confirmed) return;

      try {
        setSubmittingApplication(true);
        setApplicationMessage(null);
        await vendorApi.submitApplication(selectedFairId, houseId);
        setApplicationMessage({
          type: 'success',
          text: t('map.applicationSubmitted', 'Application submitted successfully! You will receive a confirmation email.')
        });
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || t('map.applicationError', 'Failed to submit application');
        setApplicationMessage({ type: 'error', text: errorMsg });
      } finally {
        setSubmittingApplication(false);
      }
    };

    window.addEventListener('applyForHouse', handleApplyForHouse as EventListener);
    return () => {
      window.removeEventListener('applyForHouse', handleApplyForHouse as EventListener);
    };
  }, [vendorHouses, selectedFairId, fairs, t]);

  // Handle fair selection change
  const handleFairChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFairId = e.target.value;
    setSelectedFairId(newFairId);
    if (newFairId) {
      setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.set('fairId', newFairId);
        return params;
      });
    } else {
      setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.delete('fairId');
        return params;
      });
    }
  };

  // Handle category filter change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    if (newCategory) {
      setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.set('category', newCategory);
        return params;
      });
    } else {
      setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.delete('category');
        return params;
      });
    }
  };

  // Handle closing panorama viewer
  const handleClosePanorama = () => {
    setPanoramaHouse(null);
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
          <select
            className="category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
            aria-label={t('map.filterByCategory', 'Filter by Category')}
          >
            <option value="">{t('map.allCategories', 'All Categories')}</option>
            {productCategories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {t(cat.labelKey, cat.fallback)}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <button
              className="btn btn-clear-filter"
              onClick={() => {
                setSelectedCategory('');
                setSearchParams(prev => {
                  const params = new URLSearchParams(prev);
                  params.delete('category');
                  return params;
                });
              }}
              title={t('common.clearFilters', 'Clear Filters')}
            >
              ✕
            </button>
          )}
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

      {selectedCategory && (
        <div className="filter-info">
          <span>🔍</span>
          <span>
            {t('map.filterByCategory', 'Filter by Category')}: <strong>{t(`categories.${selectedCategory}`, selectedCategory)}</strong>
          </span>
          <span className="filter-count">
            ({vendorHouses.filter(h => h.vendor && h.vendor.productCategory === selectedCategory).length} {t('map.vendorHouses', 'vendor houses')})
          </span>
          <button
            className="btn btn-clear-filter"
            onClick={() => {
              setSelectedCategory('');
              setSearchParams(prev => {
                const params = new URLSearchParams(prev);
                params.delete('category');
                return params;
              });
            }}
          >
            ✕ {t('common.clearFilters', 'Clear Filters')}
          </button>
        </div>
      )}

      {applicationMessage && (
        <div className={`application-message ${applicationMessage.type}`}>
          <span>{applicationMessage.text}</span>
          <button className="btn-dismiss" onClick={() => setApplicationMessage(null)}>✕</button>
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

      {/* Panorama Viewer Modal */}
      {panoramaHouse && (
        <PanoramaViewer
          panoramaUrl={panoramaHouse.panorama360Url}
          houseNumber={panoramaHouse.houseNumber}
          onClose={handleClosePanorama}
        />
      )}
    </div>
  );
};

export default MapPage;
