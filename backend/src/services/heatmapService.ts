import { Server } from 'socket.io';
import { prisma } from '../index';

/**
 * Crowd-density heatmap aggregator.
 *
 * Every AGGREGATION_INTERVAL_MS the service reads the last-known location of
 * every user who (a) opted into location sharing and (b) pinged within the
 * freshness window, snaps each point onto a ~50 m grid, and publishes the
 * per-cell counts as a GeoJSON FeatureCollection:
 *   - pushed to Socket.io room 'heatmap' as 'heatmap:update'
 *   - cached in memory for the REST fallback (GET /api/public/heatmap) so
 *     anonymous visitors and freshly-connected clients get data instantly.
 *
 * Privacy invariants (do not weaken):
 *   - Individual identities never leave this module — only cell counts.
 *   - Cells with fewer than MIN_CELL_COUNT people are dropped entirely
 *     (k-anonymity: a lone dot on an empty field would identify someone).
 */

// ~50 m at Baku's latitude. 1° latitude ≈ 111.3 km; longitude cells are
// slightly narrower at 40°N which is fine for a visual density layer.
const GRID_SIZE_DEG = 0.00045;

// A location older than this no longer counts toward "who is here now".
const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

const AGGREGATION_INTERVAL_MS = 30 * 1000;

// k-anonymity floor. Overridable for local development where there is only
// a handful of test accounts (HEATMAP_MIN_CELL_COUNT=1).
const MIN_CELL_COUNT = Math.max(
  1,
  parseInt(process.env.HEATMAP_MIN_CELL_COUNT || '3', 10) || 3
);

export interface HeatmapSnapshot {
  updatedAt: string;
  // Total people currently sharing (pre-suppression) — a "N people at the
  // fair" statistic that leaks no positions.
  activeCount: number;
  cells: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: { type: 'Point'; coordinates: [number, number] };
      properties: { count: number };
    }>;
  };
}

let latestSnapshot: HeatmapSnapshot = {
  updatedAt: new Date(0).toISOString(),
  activeCount: 0,
  cells: { type: 'FeatureCollection', features: [] },
};

let timer: NodeJS.Timeout | null = null;

export function getHeatmapSnapshot(): HeatmapSnapshot {
  return latestSnapshot;
}

async function aggregate(io: Server): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - FRESHNESS_WINDOW_MS);
    const users = await prisma.user.findMany({
      where: {
        isSharingLocation: true,
        isActive: true,
        locationUpdatedAt: { gte: cutoff },
        lastLatitude: { not: null },
        lastLongitude: { not: null },
      },
      select: { lastLatitude: true, lastLongitude: true },
    });

    // Snap to grid; key = "latIndex:lngIndex".
    const cellCounts = new Map<string, number>();
    for (const u of users) {
      const latIdx = Math.floor((u.lastLatitude as number) / GRID_SIZE_DEG);
      const lngIdx = Math.floor((u.lastLongitude as number) / GRID_SIZE_DEG);
      const key = `${latIdx}:${lngIdx}`;
      cellCounts.set(key, (cellCounts.get(key) || 0) + 1);
    }

    const features: HeatmapSnapshot['cells']['features'] = [];
    for (const [key, count] of cellCounts) {
      if (count < MIN_CELL_COUNT) continue;
      const [latIdx, lngIdx] = key.split(':').map(Number);
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          // Cell centroid — never an actual user position.
          coordinates: [
            (lngIdx + 0.5) * GRID_SIZE_DEG,
            (latIdx + 0.5) * GRID_SIZE_DEG,
          ],
        },
        properties: { count },
      });
    }

    latestSnapshot = {
      updatedAt: new Date().toISOString(),
      activeCount: users.length,
      cells: { type: 'FeatureCollection', features },
    };

    io.to('heatmap').emit('heatmap:update', latestSnapshot);
  } catch (err) {
    console.error('Heatmap aggregation error:', err);
  }
}

/**
 * Start the periodic aggregator. Call once after the WebSocket server is up.
 * Runs an immediate first pass so the cache is warm before the first client.
 */
export function startHeatmapAggregator(io: Server): void {
  if (timer) return;
  void aggregate(io);
  timer = setInterval(() => void aggregate(io), AGGREGATION_INTERVAL_MS);
  // Don't keep the process alive just for the heatmap (matters for tests).
  timer.unref?.();
  console.log(
    `Heatmap aggregator started (every ${AGGREGATION_INTERVAL_MS / 1000}s, min cell count ${MIN_CELL_COUNT})`
  );
}
