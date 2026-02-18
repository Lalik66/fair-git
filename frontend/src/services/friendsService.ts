/**
 * Friends Service
 * Handles API calls for friend locations and follow relationships
 */
import api from './api';

/**
 * Friend location data returned from the API
 */
export interface FriendLocation {
  id: string;
  name: string;
  lastLatitude: number;
  lastLongitude: number;
  locationUpdatedAt: string;
}

/**
 * Following user data
 */
export interface FollowingUser {
  id: string;
  name: string;
  email: string;
  followedAt: string;
}

/**
 * Custom error class for friends API errors
 */
export class FriendsApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'FriendsApiError';
  }
}

/**
 * Get locations of all users the current user is following
 * Only returns friends with valid latitude and longitude
 *
 * @returns Array of friend locations
 * @throws {FriendsApiError} If the request fails
 */
export async function getFriendLocations(): Promise<FriendLocation[]> {
  try {
    const response = await api.get('/friends/locations');
    return response.data.friends;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as { response?: { status?: number; data?: { error?: string } } };
      const statusCode = axiosErr.response?.status;
      const errorMessage = axiosErr.response?.data?.error || 'Failed to get friend locations';
      throw new FriendsApiError(errorMessage, statusCode);
    }
    throw new FriendsApiError('Failed to get friend locations');
  }
}

/**
 * Follow a user to see their location on the map
 *
 * @param userId - The ID of the user to follow
 * @throws {FriendsApiError} If the request fails
 */
export async function followUser(userId: string): Promise<void> {
  try {
    await api.post(`/friends/follow/${userId}`);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as { response?: { status?: number; data?: { error?: string } } };
      const statusCode = axiosErr.response?.status;
      const errorMessage = axiosErr.response?.data?.error || 'Failed to follow user';
      throw new FriendsApiError(errorMessage, statusCode);
    }
    throw new FriendsApiError('Failed to follow user');
  }
}

/**
 * Unfollow a user to stop seeing their location
 *
 * @param userId - The ID of the user to unfollow
 * @throws {FriendsApiError} If the request fails
 */
export async function unfollowUser(userId: string): Promise<void> {
  try {
    await api.delete(`/friends/unfollow/${userId}`);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as { response?: { status?: number; data?: { error?: string } } };
      const statusCode = axiosErr.response?.status;
      const errorMessage = axiosErr.response?.data?.error || 'Failed to unfollow user';
      throw new FriendsApiError(errorMessage, statusCode);
    }
    throw new FriendsApiError('Failed to unfollow user');
  }
}

/**
 * Get list of users the current user is following
 *
 * @returns Array of followed users
 * @throws {FriendsApiError} If the request fails
 */
export async function getFollowing(): Promise<FollowingUser[]> {
  try {
    const response = await api.get('/friends/following');
    return response.data.following;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as { response?: { status?: number; data?: { error?: string } } };
      const statusCode = axiosErr.response?.status;
      const errorMessage = axiosErr.response?.data?.error || 'Failed to get following list';
      throw new FriendsApiError(errorMessage, statusCode);
    }
    throw new FriendsApiError('Failed to get following list');
  }
}

export default {
  getFriendLocations,
  followUser,
  unfollowUser,
  getFollowing,
};
