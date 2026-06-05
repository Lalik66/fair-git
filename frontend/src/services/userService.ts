import api from './api';

/**
 * Get the current user's "share live location" flag.
 */
export async function getLocationSharing(): Promise<boolean> {
  const res = await api.get<{ isSharingLocation: boolean }>('/user/sharing-location');
  return res.data.isSharingLocation;
}

/**
 * Toggle the current user's "share live location" flag. When set to false,
 * the backend also scrubs the stored lat/lng so the previous position
 * disappears for followers immediately.
 */
export async function setLocationSharing(enabled: boolean): Promise<boolean> {
  const res = await api.patch<{ isSharingLocation: boolean }>('/user/sharing-location', {
    enabled,
  });
  return res.data.isSharingLocation;
}
