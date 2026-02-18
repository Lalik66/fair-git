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

export default router;
