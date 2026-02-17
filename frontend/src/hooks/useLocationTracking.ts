import { useEffect, useRef, useCallback } from 'react';
import { distance, point } from '@turf/turf';
import type { GeolocateControl } from 'mapbox-gl';
import { updateUserLocation } from '../services/locationService';

interface UseLocationTrackingOptions {
  /** The GeolocateControl instance from Mapbox GL */
  geolocateControl: GeolocateControl | null;
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Minimum distance in meters before sending update (default: 5) */
  minDistanceMeters?: number;
  /** Minimum time in ms between updates (default: 15000) */
  throttleMs?: number;
  /** Optional callback when location is successfully sent */
  onLocationSent?: (lat: number, lng: number) => void;
  /** Optional callback when error occurs */
  onError?: (error: Error) => void;
}

interface LocationState {
  latitude: number;
  longitude: number;
  timestamp: number;
}

/**
 * React hook for tracking user location and syncing with the backend.
 *
 * Features:
 * - Integrates with Mapbox GeolocateControl events
 * - Only tracks when user activates location (clicks the button)
 * - Stops tracking when user deactivates or component unmounts
 * - Uses Turf.js to filter updates (only sends if moved > 5 meters)
 * - Throttles updates to max once every 15 seconds
 * - Only runs when user is authenticated
 *
 * @example
 * ```tsx
 * const mapRef = useRef<mapboxgl.Map | null>(null);
 * const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
 *
 * useLocationTracking({
 *   geolocateControl: geolocateRef.current,
 *   isAuthenticated: !!user,
 *   onLocationSent: (lat, lng) => console.log('Location sent:', lat, lng),
 *   onError: (err) => console.error('Location error:', err),
 * });
 * ```
 */
export function useLocationTracking({
  geolocateControl,
  isAuthenticated,
  minDistanceMeters = 5,
  throttleMs = 15000,
  onLocationSent,
  onError,
}: UseLocationTrackingOptions): void {
  // Track last sent position for distance check
  const lastSentPositionRef = useRef<LocationState | null>(null);

  // Track the watchPosition ID for cleanup
  const watchIdRef = useRef<number | null>(null);

  // Track if location tracking is currently active
  const isTrackingRef = useRef<boolean>(false);

  // Track last update time for throttling
  const lastUpdateTimeRef = useRef<number>(0);

  // Pending update timeout for throttled updates
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Check if enough distance has been traveled to warrant an update
   */
  const hasMovedEnough = useCallback(
    (newLat: number, newLng: number): boolean => {
      if (!lastSentPositionRef.current) {
        return true; // First position, always send
      }

      const from = point([lastSentPositionRef.current.longitude, lastSentPositionRef.current.latitude]);
      const to = point([newLng, newLat]);
      const distanceInMeters = distance(from, to, { units: 'meters' });

      return distanceInMeters >= minDistanceMeters;
    },
    [minDistanceMeters]
  );

  /**
   * Send location update to backend with throttling
   */
  const sendLocationUpdate = useCallback(
    async (lat: number, lng: number) => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

      // If we haven't waited long enough, schedule for later
      if (timeSinceLastUpdate < throttleMs) {
        // Clear any existing pending update
        if (pendingUpdateRef.current) {
          clearTimeout(pendingUpdateRef.current);
        }

        // Schedule update for when throttle period ends
        const delay = throttleMs - timeSinceLastUpdate;
        pendingUpdateRef.current = setTimeout(() => {
          sendLocationUpdate(lat, lng);
        }, delay);
        return;
      }

      // Check distance threshold
      if (!hasMovedEnough(lat, lng)) {
        return;
      }

      try {
        console.log('[LocationTracking] Sending location update:', lat, lng);
        await updateUserLocation(lat, lng);

        // Update tracking state
        lastSentPositionRef.current = {
          latitude: lat,
          longitude: lng,
          timestamp: now,
        };
        lastUpdateTimeRef.current = now;

        onLocationSent?.(lat, lng);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [hasMovedEnough, throttleMs, onLocationSent, onError]
  );

  /**
   * Handle position updates from watchPosition
   */
  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      sendLocationUpdate(latitude, longitude);
    },
    [sendLocationUpdate]
  );

  /**
   * Handle geolocation errors
   */
  const handlePositionError = useCallback(
    (error: GeolocationPositionError) => {
      onError?.(new Error(`Geolocation error: ${error.message}`));
    },
    [onError]
  );

  /**
   * Start watching position
   */
  const startTracking = useCallback(() => {
    if (isTrackingRef.current || watchIdRef.current !== null) {
      return; // Already tracking
    }

    if (!navigator.geolocation) {
      onError?.(new Error('Geolocation is not supported by this browser'));
      return;
    }

    isTrackingRef.current = true;

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // Accept positions up to 10 seconds old
        timeout: 20000, // Wait up to 20 seconds for a position
      }
    );
  }, [handlePositionUpdate, handlePositionError, onError]);

  /**
   * Stop watching position and clean up
   */
  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
  }, []);

  /**
   * Set up GeolocateControl event listeners
   */
  useEffect(() => {
    console.log('[LocationTracking] Effect fired — geolocateControl:', !!geolocateControl, 'isAuthenticated:', isAuthenticated);

    if (!geolocateControl || !isAuthenticated) {
      return;
    }

    console.log('[LocationTracking] Attaching GeolocateControl listeners');

    const handleTrackStart = () => {
      console.log('[LocationTracking] trackuserlocationstart — starting watchPosition');
      startTracking();
    };

    const handleTrackEnd = () => {
      console.log('[LocationTracking] trackuserlocationend — stopping watchPosition');
      stopTracking();
    };

    // Listen to GeolocateControl events
    geolocateControl.on('trackuserlocationstart', handleTrackStart);
    geolocateControl.on('trackuserlocationend', handleTrackEnd);

    // Cleanup function
    return () => {
      geolocateControl.off('trackuserlocationstart', handleTrackStart);
      geolocateControl.off('trackuserlocationend', handleTrackEnd);
      stopTracking();
    };
  }, [geolocateControl, isAuthenticated, startTracking, stopTracking]);

  /**
   * Stop tracking if user logs out
   */
  useEffect(() => {
    if (!isAuthenticated) {
      stopTracking();
      // Reset last sent position on logout
      lastSentPositionRef.current = null;
    }
  }, [isAuthenticated, stopTracking]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);
}

export default useLocationTracking;
