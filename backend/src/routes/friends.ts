import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * Friend location response type
 */
interface FriendLocation {
  id: string;
  name: string;
  lastLatitude: number;
  lastLongitude: number;
  locationUpdatedAt: string;
}

/**
 * GET /api/friends/locations
 *
 * Get locations of all users the current user is following who have shared their location.
 * Only returns friends with valid latitude and longitude.
 *
 * Response:
 *   - 200: Array of friend locations
 *   - 401: Unauthorized
 *   - 500: Database error
 */
router.get(
  '/locations',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Find all users that the current user is following
      // who have shared their location (lastLatitude and lastLongitude are not null)
      const followingWithLocations = await prisma.userFollow.findMany({
        where: {
          followerId: userId,
        },
        select: {
          following: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              lastLatitude: true,
              lastLongitude: true,
              locationUpdatedAt: true,
              isActive: true,
            },
          },
        },
      });

      // Filter and map to response format
      const friendLocations: FriendLocation[] = followingWithLocations
        .filter((follow) => {
          const user = follow.following;
          return (
            user.isActive &&
            user.lastLatitude !== null &&
            user.lastLongitude !== null
          );
        })
        .map((follow) => {
          const user = follow.following;
          const firstName = user.firstName || '';
          const lastName = user.lastName || '';
          const name = `${firstName} ${lastName}`.trim() || 'Anonymous';

          return {
            id: user.id,
            name,
            lastLatitude: user.lastLatitude!,
            lastLongitude: user.lastLongitude!,
            locationUpdatedAt: user.locationUpdatedAt?.toISOString() || '',
          };
        });

      res.json({ friends: friendLocations });
    } catch (error) {
      console.error('Get friend locations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/friends/follow/:userId
 *
 * Follow a user to see their location on the map.
 *
 * Response:
 *   - 200: Successfully followed user
 *   - 400: Cannot follow yourself
 *   - 404: User not found
 *   - 409: Already following this user
 *   - 401: Unauthorized
 *   - 500: Database error
 */
router.post(
  '/follow/:userId',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUserId = req.user!.id;
      const targetUserId = req.params.userId;

      // Cannot follow yourself
      if (currentUserId === targetUserId) {
        res.status(400).json({ error: 'Cannot follow yourself' });
        return;
      }

      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, isActive: true },
      });

      if (!targetUser || !targetUser.isActive) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if already following
      const existingFollow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
      });

      if (existingFollow) {
        res.status(409).json({ error: 'Already following this user' });
        return;
      }

      // Create follow relationship
      await prisma.userFollow.create({
        data: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      });

      res.json({ success: true, message: 'Successfully followed user' });
    } catch (error) {
      console.error('Follow user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/friends/unfollow/:userId
 *
 * Unfollow a user to stop seeing their location on the map.
 *
 * Response:
 *   - 200: Successfully unfollowed user
 *   - 404: Not following this user
 *   - 401: Unauthorized
 *   - 500: Database error
 */
router.delete(
  '/unfollow/:userId',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUserId = req.user!.id;
      const targetUserId = req.params.userId;

      // Check if following
      const existingFollow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
      });

      if (!existingFollow) {
        res.status(404).json({ error: 'Not following this user' });
        return;
      }

      // Delete follow relationship
      await prisma.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
      });

      res.json({ success: true, message: 'Successfully unfollowed user' });
    } catch (error) {
      console.error('Unfollow user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/friends/following
 *
 * Get list of users the current user is following.
 *
 * Response:
 *   - 200: Array of followed users
 *   - 401: Unauthorized
 *   - 500: Database error
 */
router.get(
  '/following',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const following = await prisma.userFollow.findMany({
        where: {
          followerId: userId,
        },
        select: {
          following: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const users = following.map((f) => ({
        id: f.following.id,
        name: `${f.following.firstName || ''} ${f.following.lastName || ''}`.trim() || 'Anonymous',
        email: f.following.email,
        followedAt: f.createdAt.toISOString(),
      }));

      res.json({ following: users });
    } catch (error) {
      console.error('Get following error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
