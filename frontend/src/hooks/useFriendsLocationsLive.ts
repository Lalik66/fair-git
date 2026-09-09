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
  // can see. We map over the polled list (the source of truth on "who counts
  // as a friend"), so live-only events for someone the user just unfollowed
  // never leak into the output.
  const merged: FriendLocation[] = polled.map((f) => live[f.id] ?? f);

  // Prune stale live entries (friends no longer in the poll) in an effect —
  // never mutate state during render. Runs whenever the visible friend set
  // changes.
  const polledIdsKey = polled.map((f) => f.id).sort().join(',');
  useEffect(() => {
    const visibleIds = new Set(polled.map((f) => f.id));
    setLive((prev) => {
      const staleIds = Object.keys(prev).filter((id) => !visibleIds.has(id));
      if (staleIds.length === 0) return prev;
      const next = { ...prev };
      for (const id of staleIds) delete next[id];
      return next;
    });
    // polledIdsKey captures the set membership; polled itself is a new array
    // reference each render, so we key the effect on the stable id string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polledIdsKey]);

  return {
    friendLocations: merged,
    isLoading,
    error,
    refresh,
    hasLiveStream,
  };
}

export default useFriendsLocationsLive;
