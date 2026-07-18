import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Map as MapboxMap, GeolocateControl } from 'mapbox-gl';
import { useMapInteraction } from '../../hooks/useMapInteraction';
import { useAuth } from '../../contexts/AuthContext';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { useFriendsLocationsLive } from '../../hooks/useFriendsLocationsLive';
import { useUserPins } from '../../hooks/useUserPins';
import { useCrowdHeatmap } from '../../hooks/useCrowdHeatmap';
import { getZones, MapZone } from '../../services/zonesService';
import { listEvents, getEvent, FairEvent } from '../../services/eventsService';
import { useRouteToFriend } from '../../hooks/useRouteToFriend';
import { emitLiveLocation } from '../../services/locationSocketService';
import { getFollowing } from '../../services/friendsService';
import { sendReaction } from '../../services/reactionsService';
import Sidebar from './Sidebar';
import MapPanel, { MapPanelRef } from './MapPanel';
import GeocoderSearch from './GeocoderSearch';
import PanoramaViewer from '../PanoramaViewer';
import FriendsPanel from './FriendsPanel';
import FoxMapPeek from '../FoxMapPeek';
import WhatsOnNowPanel from '../WhatsOnNowPanel';
import SponsorSlot from '../SponsorSlot';
import RouteInstructionsPanel from './RouteInstructionsPanel';
import ReactionPicker from '../ReactionPicker';
import VendorReviewsModal from '../VendorReviewsModal';
import '../ReactionPicker.css';
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
  // A vendor-house route requested before a location fix was available; fetched
  // once the GeolocateControl reports a position.
  const pendingRouteRef = useRef<{ lat: number; lng: number; name: string } | null>(null);

  // Friends panel state
  const [isFriendsPanelOpen, setIsFriendsPanelOpen] = useState(false);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Reaction picker state
  const [reactionPickerFriend, setReactionPickerFriend] = useState<{ id: string; name: string } | null>(null);
  // Vendor reviews modal — opened from the rating badge on a house popup.
  const [reviewsModal, setReviewsModal] = useState<{ vendorProfileId: string; vendorName: string } | null>(null);
  // Crowd-density heatmap layer toggle. Data only flows while it's on.
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [reactionMessage, setReactionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Map instance state for route hook
  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null);

  // Get auth state for location tracking
  const { user } = useAuth();

  // Vendor/admin see operational data (area, price, occupancy); regular
  // visitors (anonymous or role 'user') see only the public story.
  const isPrivileged = user?.role === 'vendor' || user?.role === 'admin';

  // Crowd-density feed: REST poll for everyone, live socket for logged-in
  // users. Only active while the layer is toggled on.
  const heatmapSnapshot = useCrowdHeatmap({
    enabled: showHeatmap,
    isAuthenticated: !!user,
  });

  // Enable location tracking when user is authenticated and geolocateControl is ready.
  // The REST write happens inside useLocationTracking; we also emit live on
  // the socket so followers see updates in real time. The backend gates both
  // paths on the per-user isSharingLocation flag, so opting out kills both.
  useLocationTracking({
    geolocateControl,
    isAuthenticated: !!user,
    onLocationSent: (lat, lng) => {
      setUserLocation({ latitude: lat, longitude: lng });
      emitLiveLocation(lat, lng);
    },
  });

  // Populate userLocation from the existing Mapbox GeolocateControl. This works
  // for anonymous visitors too (useLocationTracking is auth-gated), and is what
  // makes "Yol göstər" usable without a separate geolocation path.
  useEffect(() => {
    if (!geolocateControl) return;
    const handleGeolocate = (e: GeolocationPosition) => {
      const loc = { latitude: e.coords.latitude, longitude: e.coords.longitude };
      // Only seed if not already known so a moving user doesn't trigger a
      // re-render (and friend-marker rebuild) on every position update.
      setUserLocation((prev) => prev ?? loc);
    };
    geolocateControl.on('geolocate', handleGeolocate);
    return () => {
      geolocateControl.off('geolocate', handleGeolocate);
    };
  }, [geolocateControl]);

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

  // Fetch friends' locations when user is authenticated. Live socket events
  // are merged on top of the 30s REST poll; the poll is the source of truth
  // for "who is my friend" and the socket adds sub-second freshness.
  const { friendLocations, isLoading: friendLocationsLoading } = useFriendsLocationsLive({
    isAuthenticated: !!user,
    isActive: true,
  });

  // Personal map pins ("I parked my car here") — only for logged-in users.
  const {
    pins: userPins,
    getPin,
    savePin,
    deletePin,
  } = useUserPins({ isAuthenticated: !!user });
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Polygon zones for the currently selected fair. Public endpoint so this
  // works for anonymous visitors. Refetches when the fair selection changes.
  const [zones, setZones] = useState<MapZone[]>([]);

  // Scheduled events for the active fair, grouped by their location id. The
  // map popups read from this Map to render the "Today's program" block, and
  // the eventId deep-link below flies to the matching location.
  const [eventsByLocation, setEventsByLocation] = useState<Map<string, FairEvent[]>>(new Map());

  // "What's On Now" panel. Auto-opens when the URL carries ?whatsOn=1, which
  // is how the Schedule page hands visitors off; closing it strips the param.
  const [whatsOnOpen, setWhatsOnOpen] = useState(searchParams.get('whatsOn') === '1');

  // Get map instance when MapPanel signals it's ready (reliable vs. arbitrary delay)
  const handleMapReady = useCallback((map: MapboxMap) => {
    setMapInstance(map);
  }, []);

  // Use the route hook
  const {
    activeRoute,
    isLoading: isLoadingRoute,
    error: routeError,
    fetchRoute,
    fetchRouteToPoint,
    clearRoute,
    reportError,
    formatDistance,
    formatDuration,
  } = useRouteToFriend({
    map: mapInstance,
    userLocation,
    t,
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

  // Sync fair ID to URL. Replace instead of push: this is internal state
  // reflected into the URL, not a user navigation, so it must not stack
  // history entries (otherwise Back appears to do nothing on /map).
  useEffect(() => {
    if (selectedFairId) {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set('fairId', selectedFairId);
        return params;
      }, { replace: true });
    } else {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete('fairId');
        return params;
      }, { replace: true });
    }
  }, [selectedFairId, setSearchParams]);

  // Fetch polygon zones for the active fair. Anonymous-safe (public endpoint).
  // Empty state when no fair is selected so we don't leak zones across fairs.
  useEffect(() => {
    let cancelled = false;
    if (!selectedFairId) {
      setZones([]);
      return;
    }
    getZones(selectedFairId)
      .then((list) => {
        if (!cancelled) setZones(list);
      })
      .catch(() => {
        if (!cancelled) setZones([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFairId]);

  // Fetch all events for the active fair and bucket them by location id. We
  // fetch once per fair instead of per-popup so popups stay synchronous and
  // a busy festival doesn't N+1 the API every time a marker is tapped.
  useEffect(() => {
    let cancelled = false;
    if (!selectedFairId) {
      setEventsByLocation(new Map());
      return;
    }
    listEvents({ fairId: selectedFairId })
      .then((events) => {
        if (cancelled) return;
        const map = new Map<string, FairEvent[]>();
        for (const e of events) {
          const arr = map.get(e.locationId) ?? [];
          arr.push(e);
          map.set(e.locationId, arr);
        }
        setEventsByLocation(map);
      })
      .catch(() => {
        if (!cancelled) setEventsByLocation(new Map());
      });
    return () => { cancelled = true; };
  }, [selectedFairId]);

  // Open the panel when an external link sets ?whatsOn=1 mid-session (the
  // mount path is covered by the useState initialiser).
  useEffect(() => {
    if (searchParams.get('whatsOn') === '1' && !whatsOnOpen) setWhatsOnOpen(true);
  }, [searchParams, whatsOnOpen]);

  const closeWhatsOn = useCallback(() => {
    setWhatsOnOpen(false);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete('whatsOn');
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  // Deep link: /map?houseId=… flies to and opens a vendor-house popup.
  // Waits for the matching object to appear in filteredObjects (the public
  // map-objects load is async). Param is consumed on success so panning
  // around afterward doesn't re-trigger the fly.
  const houseIdParam = searchParams.get('houseId');
  useEffect(() => {
    if (!houseIdParam) return;
    const obj = filteredObjects.find((o) => o.id === houseIdParam);
    if (!obj) return;
    mapRef.current?.flyTo(obj.longitude, obj.latitude, 18);
    setSelectedObjectId(obj.id);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete('houseId');
      return params;
    }, { replace: true });
  }, [houseIdParam, filteredObjects, setSelectedObjectId, setSearchParams]);

  // Deep link: /map?eventId=… opens the matching event's location popup.
  // Used by the QR codes, the Schedule page, and the "What's On Now" list.
  // Runs whenever the eventId param shows up so re-clicks re-fly.
  const eventIdParam = searchParams.get('eventId');
  useEffect(() => {
    if (!eventIdParam) return;
    let cancelled = false;
    getEvent(eventIdParam)
      .then((evt) => {
        if (cancelled) return;
        const lat = evt.locationLatitude;
        const lng = evt.locationLongitude;
        if (lat == null || lng == null) return;
        mapRef.current?.flyTo(lng, lat, 18);
        // The popup is wired to the underlying MapObject by id; only houses
        // and facilities have markers (zones don't), so this no-ops cleanly
        // for zone events — the fly still happens, which is the useful bit.
        if (evt.locationType === 'house' || evt.locationType === 'facility') {
          setSelectedObjectId(evt.locationId);
        }
        // Strip the param so a later interaction can re-trigger by setting it.
        setSearchParams((prev) => {
          const params = new URLSearchParams(prev);
          params.delete('eventId');
          return params;
        }, { replace: true });
      })
      .catch(() => { /* event gone or never existed — silently ignore */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventIdParam]);

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

  // Handle Get Directions to friend
  const handleGetDirections = useCallback((friendId: string) => {
    const friend = friendLocations.find(f => f.id === friendId);
    if (friend) {
      fetchRoute(friend);
    } else {
      reportError(t('route.error.friendNotFound'));
    }
  }, [friendLocations, fetchRoute, reportError, t]);

  // Handle "Yol göstər" on a vendor-house visitor popup. If we don't have a
  // location fix yet, trigger the existing GeolocateControl and remember the
  // target; the flush effect below routes once a position arrives.
  const handleObjectDirections = useCallback((lat: number, lng: number, name: string) => {
    if (!userLocation) {
      pendingRouteRef.current = { lat, lng, name };
      if (geolocateControl) {
        geolocateControl.trigger();
      } else {
        reportError(t('route.error.noLocation'));
      }
      return;
    }
    fetchRouteToPoint({ lat, lng, name });
  }, [userLocation, geolocateControl, fetchRouteToPoint, reportError, t]);

  // Once a location fix arrives, fulfil any route requested beforehand.
  useEffect(() => {
    if (userLocation && pendingRouteRef.current) {
      const target = pendingRouteRef.current;
      pendingRouteRef.current = null;
      fetchRouteToPoint(target);
    }
  }, [userLocation, fetchRouteToPoint]);

  // "Save my car" — drops a personal pin at the user's current GPS position.
  // Requires a location fix; if missing, trigger the GeolocateControl and the
  // user can tap again once it activates.
  const handleSaveCar = useCallback(async () => {
    if (!user) return;
    if (!userLocation) {
      if (geolocateControl) geolocateControl.trigger();
      setPinMessage({ type: 'error', text: t('pin.car.needLocation', 'Enable location to save your car') });
      return;
    }
    try {
      await savePin('car', userLocation.latitude, userLocation.longitude);
      setPinMessage({ type: 'success', text: t('pin.car.saved', 'Car location saved') });
    } catch {
      setPinMessage({ type: 'error', text: t('pin.car.saveFailed', 'Could not save car location') });
    }
  }, [user, userLocation, geolocateControl, savePin, t]);

  // "Back to my car" — reuses the vendor-house directions handler so the
  // pending-fix flow and Mapbox layer cleanup stay in one place.
  const handleRouteToCar = useCallback(() => {
    const carPin = getPin('car');
    if (!carPin) return;
    handleObjectDirections(carPin.latitude, carPin.longitude, t('pin.car.title', 'My car'));
  }, [getPin, handleObjectDirections, t]);

  const handleClearCar = useCallback(async () => {
    try {
      await deletePin('car');
      setPinMessage({ type: 'success', text: t('pin.car.cleared', 'Car location cleared') });
    } catch {
      setPinMessage({ type: 'error', text: t('pin.car.clearFailed', 'Could not clear car location') });
    }
  }, [deletePin, t]);

  // Auto-dismiss pin feedback messages.
  useEffect(() => {
    if (!pinMessage) return;
    const timeoutMs = pinMessage.type === 'success' ? 2000 : 3500;
    const id = setTimeout(() => setPinMessage(null), timeoutMs);
    return () => clearTimeout(id);
  }, [pinMessage]);

  // Handle Send Reaction - opens the reaction picker
  const handleOpenReactionPicker = useCallback((friendId: string, friendName: string) => {
    setReactionPickerFriend({ id: friendId, name: friendName });
  }, []);

  // Handle emoji selection from reaction picker
  const handleReactionSelect = useCallback(async (emoji: string) => {
    if (!reactionPickerFriend) return;

    try {
      await sendReaction(reactionPickerFriend.id, emoji);
      setReactionMessage({ type: 'success', text: t('reactions.sent') });
      setReactionPickerFriend(null);

      // Auto-dismiss success message after 2 seconds
      setTimeout(() => setReactionMessage(null), 2000);
    } catch (error) {
      console.error('Failed to send reaction:', error);
      setReactionMessage({ type: 'error', text: String(error) });
      setReactionPickerFriend(null);

      // Auto-dismiss error message after 3 seconds
      setTimeout(() => setReactionMessage(null), 3000);
    }
  }, [reactionPickerFriend, t]);

  // Close reaction picker
  const handleCloseReactionPicker = useCallback(() => {
    setReactionPickerFriend(null);
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

  // Handle Escape key to close route instructions panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeRoute) {
        clearRoute();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeRoute, clearRoute]);

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
          isPrivileged={isPrivileged}
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
          userLocation={userLocation}
          onGetDirections={handleGetDirections}
          onSendReaction={handleOpenReactionPicker}
          onObjectDirections={handleObjectDirections}
          onOpenReviews={(vendorProfileId, vendorName) => setReviewsModal({ vendorProfileId, vendorName })}
          onMapReady={handleMapReady}
          isPrivileged={isPrivileged}
          userPins={userPins}
          zones={zones}
          eventsByLocation={eventsByLocation}
          heatmapData={heatmapSnapshot?.cells ?? null}
          showHeatmap={showHeatmap}
        />

        {/* Crowd-density heatmap toggle. Visible to everyone — the data is
            anonymized cell counts. Shows the fair-wide active count when on. */}
        <div className="heatmap-control">
          <button
            className={`heatmap-toggle-btn ${showHeatmap ? 'active' : ''}`}
            onClick={() => setShowHeatmap((v) => !v)}
            aria-pressed={showHeatmap}
            title={t('heatmap.toggle')}
          >
            🔥 {t('heatmap.toggle')}
            {showHeatmap && heatmapSnapshot && (
              <span className="heatmap-count">
                {t('heatmap.activeCount', { count: heatmapSnapshot.activeCount })}
              </span>
            )}
          </button>
        </div>

        {/* Personal car pin control — only visible to logged-in users.
            States: no pin → "Save my car"; pin saved → "Back to my car" + clear. */}
        {user && (
          <div className="car-pin-control">
            {getPin('car') ? (
              <>
                <button
                  className="car-pin-btn primary"
                  onClick={handleRouteToCar}
                  title={t('pin.car.routeBack', 'Walk back to my car')}
                >
                  🚗 {t('pin.car.routeBack', 'Back to my car')}
                </button>
                <button
                  className="car-pin-btn ghost"
                  onClick={handleClearCar}
                  title={t('pin.car.clear', 'Clear saved car location')}
                  aria-label={t('pin.car.clear', 'Clear saved car location')}
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                className="car-pin-btn primary"
                onClick={handleSaveCar}
                title={t('pin.car.save', 'Save my car location')}
              >
                🚗 {t('pin.car.save', 'Save my car')}
              </button>
            )}
          </div>
        )}

        {pinMessage && (
          <div className={`pin-toast ${pinMessage.type}`} role="status">
            {pinMessage.text}
          </div>
        )}
        {/* Map-top sponsor strip. Hidden when no active banner; uses the
            compact variant so it doesn't steal map estate on mobile. */}
        <div className="map-sponsor-strip">
          <SponsorSlot placement="map_top" fairId={selectedFairId ?? undefined} variant="compact" hideLabel />
        </div>

        <FoxMapPeek />

        {/* "What's On Now" launcher + slide-up panel. Launcher hides while
            the panel is open so we don't double up the UI. */}
        {!whatsOnOpen && selectedFairId && (
          <button
            className="whats-on-launcher"
            onClick={() => setWhatsOnOpen(true)}
            aria-label={t('whatsOn.title', "What's on now")}
          >
            <span className="dot" aria-hidden="true" />
            {t('whatsOn.title', "What's on now")}
          </button>
        )}
        {whatsOnOpen && selectedFairId && (
          <WhatsOnNowPanel
            fairId={selectedFairId}
            onClose={closeWhatsOn}
            onPick={(e) => {
              // Reuse the same fly+select path the eventId deep-link uses,
              // but without a route change — we're already on /map.
              if (e.locationLatitude != null && e.locationLongitude != null) {
                mapRef.current?.flyTo(e.locationLongitude, e.locationLatitude, 18);
                if (e.locationType === 'house' || e.locationType === 'facility') {
                  setSelectedObjectId(e.locationId);
                }
              }
            }}
          />
        )}

        {/* Screen reader announcement for route status */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {activeRoute && t('route.routeCalculated', { distance: formatDistance(activeRoute.distance), duration: formatDuration(activeRoute.duration) })}
          {isLoadingRoute && t('route.findingPath')}
          {routeError && routeError}
        </div>

        {/* Route loading indicator */}
        {isLoadingRoute && (
          <div
            className="route-loading-overlay"
            role="dialog"
            aria-label={t('route.findingPath')}
            aria-busy="true"
          >
            <div className="route-loading-content">
              <span className="route-loading-icon" aria-hidden="true">🧭</span>
              <p>{t('route.findingPath')}</p>
            </div>
          </div>
        )}

        {/* Route error message */}
        {routeError && (
          <div className="route-error-message">
            <span>⚠️</span>
            <p>{routeError}</p>
            <button onClick={clearRoute}>{t('route.dismiss')}</button>
          </div>
        )}

        {/* Route Instructions Panel */}
        {activeRoute && (
          <RouteInstructionsPanel
            destinationName={activeRoute.destinationName}
            totalDistance={activeRoute.distance}
            totalDuration={activeRoute.duration}
            steps={activeRoute.steps}
            onClearRoute={clearRoute}
            formatDistance={formatDistance}
            formatDuration={formatDuration}
            isMobile={isMobile}
            friendLocationUpdatedAt={activeRoute.friendId ? friendLocations.find(f => f.id === activeRoute.friendId)?.locationUpdatedAt : undefined}
          />
        )}
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
          friendLocations={friendLocations}
          friendLocationsLoading={friendLocationsLoading}
        />
      )}

      {/* Vendor Reviews Modal */}
      {reviewsModal && (
        <VendorReviewsModal
          vendorProfileId={reviewsModal.vendorProfileId}
          vendorName={reviewsModal.vendorName}
          onClose={() => setReviewsModal(null)}
        />
      )}

      {/* Reaction Picker Modal */}
      {reactionPickerFriend && (
        <div className="reaction-picker-overlay" onClick={handleCloseReactionPicker}>
          <div onClick={(e) => e.stopPropagation()}>
            <ReactionPicker
              onSelect={handleReactionSelect}
              onClose={handleCloseReactionPicker}
            />
          </div>
        </div>
      )}

      {/* Reaction Message Toast */}
      {reactionMessage && (
        <div className={`reaction-message-toast ${reactionMessage.type}`}>
          {reactionMessage.type === 'success' ? '✓' : '⚠️'} {reactionMessage.text}
        </div>
      )}
    </div>
  );
};

export default SplitViewMapLayout;
