import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type GeolocateControl } from 'mapbox-gl';
import { useMapInteraction } from '../../hooks/useMapInteraction';
import { useAuth } from '../../contexts/AuthContext';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { useFriendsLocations } from '../../hooks/useFriendsLocations';
import { getFollowing } from '../../services/friendsService';
import Sidebar from './Sidebar';
import MapPanel, { MapPanelRef } from './MapPanel';
import GeocoderSearch from './GeocoderSearch';
import PanoramaViewer from '../PanoramaViewer';
import FriendsPanel from './FriendsPanel';
import FoxMapPeek from '../FoxMapPeek';
import './SplitViewMapLayout.css';

// Get Mapbox token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MAPBOX_TOKEN = (import.meta as any).env.VITE_MAPBOX_TOKEN || '';

const SplitViewMapLayout: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [panoramaState, setPanoramaState] = useState<{ url: string | null; houseNumber: string } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const mapRef = useRef<MapPanelRef>(null);
  const [geolocateControl, setGeolocateControl] = useState<GeolocateControl | null>(null);

  // Friends panel state
  const [isFriendsPanelOpen, setIsFriendsPanelOpen] = useState(false);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get auth state for location tracking
  const { user } = useAuth();

  // Enable location tracking when user is authenticated and geolocateControl is ready
  useLocationTracking({
    geolocateControl,
    isAuthenticated: !!user,
    onLocationSent: (lat, lng) => {
      setUserLocation({ latitude: lat, longitude: lng });
    },
  });

  // Fetch friends count when user is authenticated
  useEffect(() => {
    if (user) {
      getFollowing()
        .then((friends) => setFriendsCount(friends.length))
        .catch(() => setFriendsCount(0));
    } else {
      setFriendsCount(0);
    }
  }, [user]);

  // Fetch friends' locations when user is authenticated
  const { friendLocations } = useFriendsLocations({
    isAuthenticated: !!user,
    isActive: true,
  });

  // Get initial fair ID from URL
  const initialFairId = searchParams.get('fairId');

  const {
    selectedObjectId,
    activeFilter,
    searchQuery,
    filteredObjects,
    isLoading,
    error,
    fairs,
    selectedFairId,
    selectedFair,
    setSelectedObjectId,
    setActiveFilter,
    setSearchQuery,
    setSelectedFairId,
  } = useMapInteraction(initialFairId);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync fair ID to URL
  useEffect(() => {
    if (selectedFairId) {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set('fairId', selectedFairId);
        return params;
      });
    } else {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete('fairId');
        return params;
      });
    }
  }, [selectedFairId, setSearchParams]);

  // Listen for panorama open events from popup buttons
  useEffect(() => {
    const handleOpenPanorama = (e: CustomEvent) => {
      const objectId = e.detail;
      const obj = filteredObjects.find((o) => o.id === objectId);
      // Allow opening panorama even without URL - demo fallback will be used
      if (obj && obj.type === 'vendor_house') {
        setPanoramaState({
          url: obj.panorama360Url || null,
          houseNumber: obj.houseNumber || obj.label,
        });
      }
    };

    window.addEventListener('openPanorama', handleOpenPanorama as EventListener);
    return () => {
      window.removeEventListener('openPanorama', handleOpenPanorama as EventListener);
    };
  }, [filteredObjects]);

  // Get map center from selected fair (memoized to avoid unnecessary flyTo on re-renders)
  const mapCenter = useMemo((): [number, number] | undefined => {
    if (selectedFair?.mapCenterLat != null && selectedFair?.mapCenterLng != null) {
      return [selectedFair.mapCenterLng, selectedFair.mapCenterLat];
    }
    return undefined;
  }, [selectedFair?.mapCenterLat, selectedFair?.mapCenterLng]);

  // Handle geocoder location selection
  const handleLocationSelect = useCallback((lng: number, lat: number, zoom?: number) => {
    mapRef.current?.flyTo(lng, lat, zoom);
  }, []);

  // Handle fly to friend location
  const handleFlyToFriend = useCallback((lng: number, lat: number) => {
    mapRef.current?.flyTo(lng, lat, 17);
  }, []);

  // Refresh friends count when panel closes
  const handleFriendsPanelClose = useCallback(() => {
    setIsFriendsPanelOpen(false);
    // Refresh count in case friends were added/removed
    if (user) {
      getFollowing()
        .then((friends) => setFriendsCount(friends.length))
        .catch(() => {});
    }
  }, [user]);

  // Proximity for geocoder - use fair center or Baku as default
  const geocoderProximity: [number, number] = mapCenter || [49.8671, 40.4093]; // Baku center

  return (
    <div className="split-view-container">
      {error && (
        <div className="split-view-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Yenidən cəhd edin</button>
        </div>
      )}

      {/* Sidebar (desktop only) */}
      {!isMobile && (
        <Sidebar
          objects={filteredObjects}
          selectedObjectId={selectedObjectId}
          onObjectSelect={setSelectedObjectId}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          fairs={fairs}
          selectedFairId={selectedFairId}
          onFairChange={setSelectedFairId}
          isLoading={isLoading}
        />
      )}

      {/* Map panel with geocoder search */}
      <div className="map-wrapper">
        {/* Geocoder Search - positioned on top of map */}
        <GeocoderSearch
          onLocationSelect={handleLocationSelect}
          mapboxToken={MAPBOX_TOKEN}
          proximity={geocoderProximity}
          country="az"
          className="map-geocoder"
        />

        {/* Desktop Friends Tab Button */}
        {user && !isMobile && (
          <button
            className="friends-tab-btn"
            onClick={() => setIsFriendsPanelOpen(true)}
            title={t('friends.tab')}
          >
            <span className="friends-tab-icon">👥</span>
            <span className="friends-tab-text">{t('friends.tab')}</span>
            {friendsCount > 0 && (
              <span className="friends-count-badge">{friendsCount}</span>
            )}
          </button>
        )}

        {/* Mobile Friends Button */}
        {user && isMobile && (
          <button
            className="friends-tab-btn-mobile"
            onClick={() => setIsFriendsPanelOpen(true)}
            title={t('friends.tab')}
          >
            👥
            {friendsCount > 0 && (
              <span className="friends-count-badge-mobile">{friendsCount}</span>
            )}
          </button>
        )}

        <MapPanel
          ref={mapRef}
          objects={filteredObjects}
          selectedObjectId={selectedObjectId}
          onObjectSelect={setSelectedObjectId}
          mapCenter={mapCenter}
          onGeolocateControlReady={setGeolocateControl}
          friendLocations={friendLocations}
          className="split-view-map"
        />
        <FoxMapPeek />
      </div>

      {/* Mobile bottom sheet placeholder - can be expanded later */}
      {isMobile && (
        <div className="mobile-controls">
          <div className="mobile-fair-selector">
            <select
              value={selectedFairId || ''}
              onChange={(e) => setSelectedFairId(e.target.value || null)}
            >
              <option value="">Bütün yarmarkalar</option>
              {fairs.map((fair) => (
                <option key={fair.id} value={fair.id}>
                  {fair.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mobile-filter-bar">
            {['all', 'vendor_house', 'cafe', 'restroom', 'parking'].map((filter) => (
              <button
                key={filter}
                className={`mobile-filter-btn ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter as any)}
              >
                {filter === 'all' && '📍'}
                {filter === 'vendor_house' && '🏠'}
                {filter === 'cafe' && '☕'}
                {filter === 'restroom' && '🚻'}
                {filter === 'parking' && '🅿️'}
              </button>
            ))}
          </div>
          <div className="mobile-results-count">
            {filteredObjects.length} nəticə
          </div>
        </div>
      )}

      {/* Panorama preview for selected vendor house */}
      {selectedObjectId && !isMobile && (() => {
        const selectedObj = filteredObjects.find(o => o.id === selectedObjectId);
        // Show preview for all vendor houses - demo fallback will be used if no URL
        if (selectedObj?.type === 'vendor_house') {
          const isDemo = !selectedObj.panorama360Url;
          return (
            <div className="panorama-preview">
              <div className="panorama-preview-header">
                <span className="preview-title">🔄 360° Önizləmə{isDemo ? ' (Demo)' : ''}</span>
                <span className="preview-house">{selectedObj.label}</span>
              </div>
              <button
                className="panorama-preview-btn"
                onClick={() => setPanoramaState({
                  url: selectedObj.panorama360Url || null,
                  houseNumber: selectedObj.houseNumber || selectedObj.label,
                })}
              >
                Tam ekranda bax
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* Panorama Viewer Modal */}
      {panoramaState && (
        <PanoramaViewer
          key={panoramaState.url ?? 'demo'}
          panoramaUrl={panoramaState.url}
          houseNumber={panoramaState.houseNumber}
          onClose={() => setPanoramaState(null)}
        />
      )}

      {/* Friends Panel */}
      {user && (
        <FriendsPanel
          isOpen={isFriendsPanelOpen}
          onClose={handleFriendsPanelClose}
          isMobile={isMobile}
          userLocation={userLocation}
          onFlyToFriend={handleFlyToFriend}
        />
      )}
    </div>
  );
};

export default SplitViewMapLayout;
