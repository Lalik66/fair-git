import api from './api';

export type AnalyticsEventType = 'popup_open' | 'directions';

export interface HouseClickRow {
  vendorHouseId: string;
  houseNumber: string;
  popupOpens: number;
  directionsTaps: number;
  total: number;
}

export interface AnalyticsSummary {
  rangeDays: number;
  totalClicks: number;
  houses: HouseClickRow[];
  hourBuckets: number[]; // length 24
}

/**
 * Fire-and-forget click event. Never throws — analytics must never break the
 * map UI if the backend is down.
 */
export function trackVendorClick(
  vendorHouseId: string,
  eventType: AnalyticsEventType = 'popup_open',
): void {
  api.post('/analytics/click', { vendorHouseId, eventType }).catch(() => {
    // swallow
  });
}

export async function getVendorAnalytics(days = 7): Promise<AnalyticsSummary> {
  const res = await api.get<AnalyticsSummary>('/analytics/vendor-houses', {
    params: { days },
  });
  return res.data;
}
