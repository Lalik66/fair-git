import { useState, useEffect, useRef, useCallback } from 'react';
import { getFriendLocations, FriendLocation } from '../services/friendsService';

interface UseFriendsLocationsOptions {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether polling should be active (e.g., user is on map page) */
  isActive?: boolean;
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  pollIntervalMs?: number;
  /** Optional callback when locations are updated */
  onLocationsUpdated?: (locations: FriendLocation[]) => void;
  /** Optional callback when error occurs */
  onError?: (error: Error) => void;
}

interface UseFriendsLocationsResult {
  /** Array of friend locations */
  friendLocations: FriendLocation[];
  /** Whether locations are currently being fetched */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Manually refresh friend locations */
  refresh: () => Promise<void>;
}

/**
 * React hook for fetching and polling friend locations.
 *
 * Features:
 * - Fetches friend locations on mount (if authenticated and active)
 * - Polls every 30 seconds by default
 * - Only polls when isActive is true (e.g., user is on map page)
 * - Automatically stops polling on unmount
 * - Provides manual refresh function
 *
 * @example
 * ```tsx
 * const { friendLocations, isLoading, error, refresh } = useFriendsLocations({
 *   isAuthenticated: !!user,
 *   isActive: isMapPage,
 *   onLocationsUpdated: (locations) => console.log('Updated:', locations.length),
 *   onError: (err) => console.error('Error:', err),
 * });
 * ```
 */
export function useFriendsLocations({
  isAuthenticated,
  isActive = true,
  pollIntervalMs = 30000,
  onLocationsUpdated,
  onError,
}: UseFriendsLocationsOptions): UseFriendsLocationsResult {
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track polling interval ID for cleanup
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef<boolean>(true);

  /**
   * Fetch friend locations from the API
   */
  const fetchLocations = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const locations = await getFriendLocations();

      if (isMountedRef.current) {
        setFriendLocations(locations);
        onLocationsUpdated?.(locations);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (isMountedRef.current) {
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, onLocationsUpdated, onError]);

  /**
   * Start polling for friend locations
   */
  const startPolling = useCallback(() => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Set up polling interval
    pollIntervalRef.current = setInterval(() => {
      fetchLocations();
    }, pollIntervalMs);
  }, [fetchLocations, pollIntervalMs]);

  /**
   * Stop polling for friend locations
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  /**
   * Manual refresh function exposed to consumers
   */
  const refresh = useCallback(async () => {
    await fetchLocations();
  }, [fetchLocations]);

  /**
   * Initial fetch and start/stop polling based on isActive
   */
  useEffect(() => {
    if (isAuthenticated && isActive) {
      // Fetch immediately on activation
      fetchLocations();
      // Start polling
      startPolling();
    } else {
      // Stop polling when inactive or logged out
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isAuthenticated, isActive, fetchLocations, startPolling, stopPolling]);

  /**
   * Clear locations when user logs out
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setFriendLocations([]);
      setError(null);
    }
  }, [isAuthenticated]);

  /**
   * Track mounted state for cleanup
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    friendLocations,
    isLoading,
    error,
    refresh,
  };
}

export default useFriendsLocations;
