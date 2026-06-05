import { useEffect, useRef, useState } from 'react';
import { useFriendsLocations } from './useFriendsLocations';
import { onFriendLocation, FriendLocationEvent } from '../services/locationSocketService';
import type { FriendLocation } from '../services/friendsService';

interface UseFriendsLocationsLiveOptions {
  isAuthenticated: boolean;
  isActive?: boolean;
}

interface UseFriendsLocationsLiveResult {
  friendLocations: FriendLocation[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  /** True once at least one socket event has been received this session. */
  hasLiveStream: boolean;
}

/**
 * Combines two sources of friend-location data:
 *   1. The existing REST poll (every 30 s) — guarantees correctness even on
 *      flaky networks and survives socket reconnects.
 *   2. Socket.io 'friend:location' events — sub-second updates when a friend
 *      is actively walking around.
 *
 * Socket events take precedence and are merged into the polled snapshot by
 * friend id. If the socket disconnects, the next poll restores ground truth.
 */
export function useFriendsLocationsLive({
  isAuthenticated,
  isActive = true,
}: UseFriendsLocationsLiveOptions): UseFriendsLocationsLiveResult {
  const {
    friendLocations: polled,
    isLoading,
    error,
    refresh,
  } = useFriendsLocations({ isAuthenticated, isActive });

  // Live overlay keyed by friend id. Cleared when the user logs out.
  const [live, setLive] = useState<Record<string, FriendLocation>>({});
  const [hasLiveStream, setHasLiveStream] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isActive) {
      setLive({});
      setHasLiveStream(false);
      return;
    }
    const unsubscribe = onFriendLocation((evt: FriendLocationEvent) => {
      if (!isMountedRef.current) return;
      setHasLiveStream(true);
      setLive((prev) => ({
        ...prev,
        [evt.id]: {
          id: evt.id,
          name: evt.name,
          lastLatitude: evt.lastLatitude,
          lastLongitude: evt.lastLongitude,
          locationUpdatedAt: evt.locationUpdatedAt,
        },
      }));
    });
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, isActive]);

  // Merge: live overlay wins per id, but only for friends the poll says we
  // can see (so a stale live event for a friend the user just unfollowed
  // doesn't leak through).
  const visibleIds = new Set(polled.map((f) => f.id));
  const merged: FriendLocation[] = polled.map((f) =>
    live[f.id] ?? f,
  );
  // Also include live events for friends already in the polled list (handled
  // above); we intentionally do NOT add live-only friends, so the poll stays
  // the source of truth on "who counts as a friend".
  for (const id of Object.keys(live)) {
    if (!visibleIds.has(id)) {
      delete live[id]; // soft cleanup
    }
  }

  return {
    friendLocations: merged,
    isLoading,
    error,
    refresh,
    hasLiveStream,
  };
}

export default useFriendsLocationsLive;
