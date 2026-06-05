import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * Location update request body
 */
interface LocationUpdateBody {
  lat: number;
  lng: number;
}

/**
 * PATCH /api/user/location
 *
 * Update the authenticated user's current location.
 * Used for real-time location tracking on the map.
 *
 * Request body:
 *   - lat: number (latitude, -90 to 90)
 *   - lng: number (longitude, -180 to 180)
 *
 * Response:
 *   - 200: Location updated successfully
 *   - 400: Invalid coordinates
 *   - 401: Unauthorized
 *   - 500: Database error
 */
router.patch(
  '/location',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { lat, lng } = req.body as LocationUpdateBody;
      const userId = req.user!.id;

      // Validate lat/lng are numbers
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        res.status(400).json({
          error: 'Invalid coordinates: lat and lng must be numbers',
        });
        return;
      }

      // Validate lat/lng are within valid ranges
      if (lat < -90 || lat > 90) {
        res.status(400).json({
          error: 'Invalid latitude: must be between -90 and 90',
        });
        return;
      }

      if (lng < -180 || lng > 180) {
        res.status(400).json({
          error: 'Invalid longitude: must be between -180 and 180',
        });
        return;
      }

      // Privacy gate: if the user has not opted into sharing, no-op silently.
      // The client never gets to know whether the write happened, but the
      // 200 response keeps the client code path identical so we don't leak
      // the flag through error responses.
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isSharingLocation: true },
      });
      if (!user?.isSharingLocation) {
        res.json({ success: true, message: 'Location not shared (sharing disabled)' });
        return;
      }

      // Update user location in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLatitude: lat,
          lastLongitude: lng,
          locationUpdatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Location updated successfully',
      });
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /api/user/sharing-location
 *
 * Toggle whether the current user broadcasts their live location to followers.
 * Body: { enabled: boolean }. Returns the updated flag value.
 *
 * When disabling, also clears the stored last-known location so a previously
 * shared position doesn't linger for followers to fetch.
 */
router.patch(
  '/sharing-location',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { enabled } = req.body ?? {};
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'enabled must be a boolean' });
        return;
      }

      const userId = req.user!.id;
      const updated = await prisma.user.update({
        where: { id: userId },
        data: enabled
          ? { isSharingLocation: true }
          : {
              // When the user opts out, scrub the stored position so it stops
              // appearing in friends' GET /locations responses immediately.
              isSharingLocation: false,
              lastLatitude: null,
              lastLongitude: null,
              locationUpdatedAt: null,
            },
        select: { isSharingLocation: true },
      });

      res.json({ isSharingLocation: updated.isSharingLocation });
    } catch (error) {
      console.error('Update sharing-location error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/user/sharing-location
 *
 * Return the current user's sharing flag. Used by the FriendsPanel toggle to
 * render the correct initial state on mount.
 */
router.get(
  '/sharing-location',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isSharingLocation: true },
      });
      res.json({ isSharingLocation: user?.isSharingLocation ?? false });
    } catch (error) {
      console.error('Get sharing-location error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
