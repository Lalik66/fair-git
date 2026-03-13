import { useState, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { distance, point } from '@turf/turf';
import type { FriendLocation } from '../services/friendsService';
import type { ActiveRoute, RouteStep, DirectionsResponse, CachedRoute } from '../types/route';

// Get Mapbox token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MAPBOX_TOKEN = (import.meta as any).env.VITE_MAPBOX_TOKEN || '';

interface UseRouteToFriendProps {
  map: mapboxgl.Map | null;
  userLocation: { latitude: number; longitude: number } | null;
  /** Translation function for error messages (from useTranslation) */
  t?: (key: string) => string;
}

interface UseRouteToFriendReturn {
  activeRoute: ActiveRoute | null;
  isLoading: boolean;
  error: string | null;
  fetchRoute: (friend: FriendLocation) => Promise<void>;
  clearRoute: () => void;
  reportError: (message: string) => void;
  formatDistance: (meters: number) => string;
  formatDuration: (seconds: number) => string;
}

export function useRouteToFriend({ map, userLocation, t }: UseRouteToFriendProps): UseRouteToFriendReturn {
  const translate = (key: string) => (t ? t(key) : key);
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const routeCache = useRef<Map<string, CachedRoute>>(new Map());

  /**
   * Check if a valid cached route exists for the given friend
   */
  const checkCache = useCallback((friendId: string, userLat: number, userLng: number): ActiveRoute | null => {
    const cached = routeCache.current.get(friendId);
    if (!cached) return null;

    const now = Date.now();
    const cacheAge = now - cached.timestamp;

    // Cache invalid after 5 minutes
    if (cacheAge > 5 * 60 * 1000) {
      routeCache.current.delete(friendId);
      return null;
    }

    // Check if user has moved more than 100m (using Turf.js for accuracy)
    const [cachedLng, cachedLat] = cached.userPosition;
    const from = point([cachedLng, cachedLat]);
    const to = point([userLng, userLat]);
    const distMeters = distance(from, to, { units: 'meters' });

    if (distMeters > 100) {
      routeCache.current.delete(friendId);
      return null;
    }

    return cached.route;
  }, []);

  /**
   * Fetch with retry logic for network errors
   */
  const fetchWithRetry = useCallback(async (url: string, signal: AbortSignal, retries = 1): Promise<Response> => {
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        // Don't retry 4xx errors
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`API error: ${response.status}`);
        }
        throw new Error(`HTTP error: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (retries > 0 && (error as Error).name !== 'AbortError' && !(error as Error).message.startsWith('API error')) {
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchWithRetry(url, signal, retries - 1);
      }
      throw error;
    }
  }, []);

  /**
   * Format distance in meters to human-readable string
   */
  const formatDistance = useCallback((meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }, []);

  /**
   * Format duration in seconds to human-readable string
   */
  const formatDuration = useCallback((seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours} hr ${remainingMins} min` : `${hours} hr`;
  }, []);

  /**
   * Clear the route from map and reset state
   */
  const clearRoute = useCallback(() => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Remove route layer and source from map
    if (map) {
      if (map.getLayer('route')) {
        map.removeLayer('route');
      }
      if (map.getSource('route')) {
        map.removeSource('route');
      }
    }

    // Reset state
    setActiveRoute(null);
    setIsLoading(false);
    setError(null);
  }, [map]);

  const reportError = useCallback((message: string) => {
    setError(message);
  }, []);

  /**
   * Helper function to display route on map and fit bounds
   */
  const displayRouteOnMap = useCallback((routeGeometry: GeoJSON.LineString) => {
    if (!map) return;

    // Clear existing route layer/source (in case)
    if (map.getLayer('route')) {
      map.removeLayer('route');
    }
    if (map.getSource('route')) {
      map.removeSource('route');
    }

    // Add source
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: routeGeometry,
      },
    });

    // Add route line layer
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#06BEE1', // sky-blue from design system
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 6],
        'line-opacity': 0.8,
      },
    });

    // Fit map bounds to route
    const coordinates = routeGeometry.coordinates as [number, number][];
    const bounds = coordinates.reduce(
      (bounds, coord) => bounds.extend(coord),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
    );

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    map.fitBounds(bounds, {
      padding: { top: 100, bottom: 300, left: 50, right: 50 },
      duration: prefersReducedMotion ? 0 : 1000,
    });
  }, [map]);

  /**
   * Fetch route from user location to friend
   */
  const fetchRoute = useCallback(async (friend: FriendLocation): Promise<void> => {
    // Clear any existing route first
    clearRoute();

    // Check if user location is available
    if (!userLocation) {
      setError("We can't find your location. Please turn on location services! 📍");
      return;
    }

    // Check if map is ready
    if (!map) {
      setError("The map isn't ready yet. Please wait a moment and try again! 🗺️");
      return;
    }

    const userLng = userLocation.longitude;
    const userLat = userLocation.latitude;

    // Check cache first
    const cachedRoute = checkCache(friend.id, userLat, userLng);
    if (cachedRoute) {
      // Use cached route
      displayRouteOnMap(cachedRoute.geometry);
      setActiveRoute(cachedRoute);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Create abort controller for timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, 10000); // 10 second timeout

    try {
      const friendLng = friend.lastLongitude;
      const friendLat = friend.lastLatitude;

      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${userLng},${userLat};${friendLng},${friendLat}?geometries=geojson&steps=true&access_token=${MAPBOX_TOKEN}`;

      const response = await fetchWithRetry(url, abortControllerRef.current.signal, 1);

      clearTimeout(timeoutId);

      const data: DirectionsResponse = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error(data.message || 'No route found');
      }

      const route = data.routes[0];
      const routeGeometry = route.geometry;

      // Parse steps from response
      const steps: RouteStep[] = route.legs[0].steps.map((step) => ({
        instruction: step.maneuver.instruction || `Continue on ${step.name || 'path'}`,
        distance: step.distance,
        duration: step.duration,
        maneuver: {
          type: step.maneuver.type,
          modifier: step.maneuver.modifier,
        },
      }));

      // Display route on map
      displayRouteOnMap(routeGeometry);

      // Create new route object
      const newRoute: ActiveRoute = {
        friendId: friend.id,
        friendName: friend.name,
        geometry: routeGeometry,
        steps,
        distance: route.distance,
        duration: route.duration,
      };

      // Store in cache
      routeCache.current.set(friend.id, {
        route: newRoute,
        timestamp: Date.now(),
        userPosition: [userLocation.longitude, userLocation.latitude],
      });

      // Set active route state
      setActiveRoute(newRoute);

      setIsLoading(false);
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError(translate('route.error.timeout'));
        } else if (err.message.includes('API error')) {
          setError(translate('route.error.apiError'));
        } else if (err.message.includes('No route')) {
          setError(translate('route.error.noRoute'));
        } else {
          setError(translate('route.error.generic'));
        }
      } else {
        setError(translate('route.error.generic'));
      }

      setIsLoading(false);
    }
  }, [map, userLocation, clearRoute, checkCache, fetchWithRetry, displayRouteOnMap]);

  return {
    activeRoute,
    isLoading,
    error,
    fetchRoute,
    clearRoute,
    reportError,
    formatDistance,
    formatDuration,
  };
}
