import api from './api';

export type BannerPlacement = 'home_bottom' | 'map_top' | 'popup_footer' | 'sidebar';

export const BANNER_PLACEMENTS: BannerPlacement[] = [
  'home_bottom',
  'map_top',
  'popup_footer',
  'sidebar',
];

export interface SponsorBanner {
  id: string;
  fairId: string | null;
  imageUrl: string;
  linkUrl: string | null;
  altText: string | null;
  placement: BannerPlacement;
  startsAt: string;
  endsAt: string;
  priority: number;
  isActive: boolean;
}

export async function listBanners(placement: BannerPlacement, fairId?: string): Promise<SponsorBanner[]> {
  const res = await api.get<{ banners: SponsorBanner[] }>('/banners', {
    params: { placement, fairId },
  });
  return res.data.banners;
}

export async function listBannersAdmin(): Promise<SponsorBanner[]> {
  const res = await api.get<{ banners: SponsorBanner[] }>('/banners/admin/list');
  return res.data.banners;
}

export interface CreateBannerInput {
  fairId?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  altText?: string | null;
  placement: BannerPlacement;
  startsAt: string;
  endsAt: string;
  priority?: number;
  isActive?: boolean;
}

export async function createBanner(input: CreateBannerInput): Promise<SponsorBanner> {
  const res = await api.post<{ banner: SponsorBanner }>('/banners', input);
  return res.data.banner;
}

export type UpdateBannerInput = Partial<CreateBannerInput>;

export async function updateBanner(id: string, input: UpdateBannerInput): Promise<SponsorBanner> {
  const res = await api.patch<{ banner: SponsorBanner }>(`/banners/${id}`, input);
  return res.data.banner;
}

export async function deleteBanner(id: string): Promise<void> {
  await api.delete(`/banners/${id}`);
}

export async function uploadBannerImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('banner', file);
  const res = await api.post<{ imageUrl: string }>('/banners/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.imageUrl;
}

// Fire-and-forget. Errors are swallowed by the backend (204 even on internal
// failure) and we additionally ignore network errors here so tracking never
// blocks a render or a click.
export function trackBannerEvent(bannerId: string, eventType: 'impression' | 'click'): void {
  api.post(`/banners/${bannerId}/track`, { eventType }).catch(() => { /* ignore */ });
}
