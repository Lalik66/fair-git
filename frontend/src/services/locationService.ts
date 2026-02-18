/**
 * Location Service
 * Handles API calls for user location updates
 */
import api from './api';

/**
 * Custom error class for API errors
 */
export class LocationUpdateError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'LocationUpdateError';
  }
}

/**
 * Update user location in the database
 *
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @throws {LocationUpdateError} If the request fails
 */
export async function updateUserLocation(lat: number, lng: number): Promise<void> {
  // Validate coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new LocationUpdateError('Invalid coordinates: lat and lng must be numbers');
  }

  if (lat < -90 || lat > 90) {
    throw new LocationUpdateError('Invalid latitude: must be between -90 and 90');
  }

  if (lng < -180 || lng > 180) {
    throw new LocationUpdateError('Invalid longitude: must be between -180 and 180');
  }

  try {
    await api.patch('/user/location', { lat, lng });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as { response?: { status?: number; data?: { error?: string } } };
      const statusCode = axiosErr.response?.status;
      const errorMessage = axiosErr.response?.data?.error || 'Failed to update location';
      throw new LocationUpdateError(errorMessage, statusCode);
    }
    throw new LocationUpdateError('Failed to update location');
  }
}

export default { updateUserLocation };
