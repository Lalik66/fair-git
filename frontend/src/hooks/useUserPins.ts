import { useState, useEffect, useCallback } from 'react';
import {
  listPins,
  savePin as savePinApi,
  deletePin as deletePinApi,
  UserPin,
  PinLabel,
} from '../services/pinsService';

interface UseUserPinsOptions {
  /** Only fetches when authenticated. Prevents 401s for anonymous visitors. */
  isAuthenticated: boolean;
}

interface UseUserPinsResult {
  pins: UserPin[];
  /** Pin keyed by label for quick "do I have a car saved?" checks. */
  getPin: (label: PinLabel) => UserPin | undefined;
  savePin: (label: PinLabel, lat: number, lng: number) => Promise<UserPin>;
  deletePin: (label: PinLabel) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Personal map pins (e.g. "where I parked"). Private to the current user.
 * Mirrors the shape of useFriendsLocations so callers feel familiar.
 */
export function useUserPins({ isAuthenticated }: UseUserPinsOptions): UseUserPinsResult {
  const [pins, setPins] = useState<UserPin[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPins = useCallback(async () => {
    if (!isAuthenticated) {
      setPins([]);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const list = await listPins();
      setPins(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const savePin = useCallback(
    async (label: PinLabel, lat: number, lng: number): Promise<UserPin> => {
      const saved = await savePinApi(label, lat, lng);
      // Optimistic local state update — keeps the marker in sync without a
      // round-trip refetch.
      setPins((prev) => {
        const others = prev.filter((p) => p.label !== label);
        return [saved, ...others];
      });
      return saved;
    },
    [],
  );

  const deletePin = useCallback(async (label: PinLabel): Promise<void> => {
    await deletePinApi(label);
    setPins((prev) => prev.filter((p) => p.label !== label));
  }, []);

  const getPin = useCallback(
    (label: PinLabel) => pins.find((p) => p.label === label),
    [pins],
  );

  return {
    pins,
    getPin,
    savePin,
    deletePin,
    isLoading,
    error,
    refresh: fetchPins,
  };
}

export default useUserPins;
