import api from './api';
import { connectSocket } from './friendsMessagesService';

/** Anonymized crowd-density snapshot from the backend aggregator. */
export interface HeatmapCells {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { count: number };
  }>;
}

export interface HeatmapSnapshot {
  updatedAt: string;
  /** People currently sharing their location (fair-wide, no positions). */
  activeCount: number;
  cells: HeatmapCells;
}

/** REST fallback — works for anonymous visitors, no socket needed. */
export async function fetchHeatmapSnapshot(): Promise<HeatmapSnapshot> {
  const response = await api.get('/public/heatmap');
  return response.data as HeatmapSnapshot;
}

/**
 * Live stream over the shared authenticated socket. The server replies to
 * 'heatmap:subscribe' with the cached snapshot immediately, then pushes
 * 'heatmap:update' on every aggregation tick. Returns an unsubscribe fn.
 * Re-subscribes automatically after a socket reconnect.
 */
export function subscribeHeatmap(
  callback: (snapshot: HeatmapSnapshot) => void
): () => void {
  const sock = connectSocket();
  const resubscribe = () => sock.emit('heatmap:subscribe');
  sock.on('heatmap:update', callback);
  sock.on('connect', resubscribe);
  if (sock.connected) resubscribe();
  return () => {
    sock.off('heatmap:update', callback);
    sock.off('connect', resubscribe);
    if (sock.connected) sock.emit('heatmap:unsubscribe');
  };
}
