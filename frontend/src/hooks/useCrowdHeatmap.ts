import { useEffect, useState } from 'react';
import {
  fetchHeatmapSnapshot,
  subscribeHeatmap,
  HeatmapSnapshot,
} from '../services/heatmapService';

interface UseCrowdHeatmapOptions {
  /** Fetch/stream only while the heatmap layer is actually shown. */
  enabled: boolean;
  /** Socket streaming needs an authenticated user; anonymous falls back to polling. */
  isAuthenticated: boolean;
}

const POLL_INTERVAL_MS = 60 * 1000;

/**
 * Crowd-density data feed for the map heatmap layer.
 *
 * Same dual-source pattern as useFriendsLocationsLive: a REST poll
 * guarantees data for everyone (including anonymous visitors), and the
 * Socket.io stream upgrades logged-in users to per-tick freshness.
 */
export function useCrowdHeatmap({
  enabled,
  isAuthenticated,
}: UseCrowdHeatmapOptions): HeatmapSnapshot | null {
  const [snapshot, setSnapshot] = useState<HeatmapSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const load = async () => {
      try {
        const s = await fetchHeatmapSnapshot();
        if (!cancelled) setSnapshot(s);
      } catch {
        // Keep showing the last snapshot; the next poll retries.
      }
    };

    void load();
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);

    let unsubscribe: (() => void) | null = null;
    if (isAuthenticated) {
      unsubscribe = subscribeHeatmap((s) => {
        if (!cancelled) setSnapshot(s);
      });
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribe?.();
    };
  }, [enabled, isAuthenticated]);

  return snapshot;
}
