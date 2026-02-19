import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import { randomUUID } from 'crypto';

const router = Router();

// Constants
const INVITE_EXPIRY_HOURS = 24;

/**
 * POST /api/invite/create
 *
 * Create a new invite link with 24-hour expiry.
 * Auth required.
 *
 * Response:
 *   - 200: { token, url, expiresAt }
 *   - 401: Unauthorized
 *   - 500: Internal server error
 */
router.post(
  '/create',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Generate unique token
      const token = randomUUID();

      // Calculate expiry (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

      // Create invite link
      const inviteLink = await prisma.inviteLink.create({
        data: {
          token,
          createdById: userId,
          expiresAt,
        },
      });

      // Build the invite URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const url = `${frontendUrl}/invite/${token}`;

      res.json({
        token: inviteLink.token,
        url,
        expiresAt: inviteLink.expiresAt.toISOString(),
      });
    } catch (error) {
      console.error('Create invite link error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/invite/:token
 *
 * Validate an invite token and return inviter info.
 * No auth required.
 *
 * Response:
 *   - 200: { inviterName, inviterId, isValid: true }
 *   - 200: { isValid: false, error: "..." } (for invalid/expired)
 */
router.get(
  '/:token',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;

      // Find the invite link
      const inviteLink = await prisma.inviteLink.findUnique({
        where: { token },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              isActive: true,
            },
          },
        },
      });

      // Check if token exists
      if (!inviteLink) {
        res.json({
          isValid: false,
          error: 'Invalid invite link',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      // Check if expired
      if (new Date() > inviteLink.expiresAt) {
        res.json({
          isValid: false,
          error: 'Invite link has expired',
          code: 'EXPIRED',
        });
        return;
      }

      // Check if inviter is still active
      if (!inviteLink.createdBy.isActive) {
        res.json({
          isValid: false,
          error: 'Inviter account is no longer active',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      // Build inviter name
      const firstName = inviteLink.createdBy.firstName || '';
      const lastName = inviteLink.createdBy.lastName || '';
      const inviterName = `${firstName} ${lastName}`.trim() || 'Anonymous';

      res.json({
        isValid: true,
        inviterName,
        inviterId: inviteLink.createdBy.id,
      });
    } catch (error) {
      console.error('Validate invite error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/invite/:token/accept
 *
 * Accept an invite and create bidirectional follow relationships.
 * Auth required.
 *
 * Response:
 *   - 200: { success: true, message: "You are now friends!" }
 *   - 400: { error: "...", code: "SELF_INVITE" | "ALREADY_FOLLOWING" }
 *   - 400: { error: "...", code: "EXPIRED" | "INVALID_TOKEN" }
 *   - 401: Unauthorized
 *   - 500: Internal server error
 */
router.post(
  '/:token/accept',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const accepterId = req.user!.id;
      const { token } = req.params;

      // Find the invite link
      const inviteLink = await prisma.inviteLink.findUnique({
        where: { token },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              isActive: true,
            },
          },
        },
      });

      // Check if token exists
      if (!inviteLink) {
        res.status(400).json({
          error: 'Invalid invite link',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      // Check if expired
      if (new Date() > inviteLink.expiresAt) {
        res.status(400).json({
          error: 'Invite link has expired',
          code: 'EXPIRED',
        });
        return;
      }

      // Check if inviter is still active
      if (!inviteLink.createdBy.isActive) {
        res.status(400).json({
          error: 'Inviter account is no longer active',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      const inviterId = inviteLink.createdBy.id;

      // Check if trying to accept own invite
      if (accepterId === inviterId) {
        res.status(400).json({
          error: 'Cannot invite yourself',
          code: 'SELF_INVITE',
        });
        return;
      }

      // Check if already following (bidirectional check)
      const existingFollows = await prisma.userFollow.findMany({
        where: {
          OR: [
            { followerId: accepterId, followingId: inviterId },
            { followerId: inviterId, followingId: accepterId },
          ],
        },
      });

      // If both directions already exist, they are already friends
      const accepterFollowsInviter = existingFollows.some(
        (f) => f.followerId === accepterId && f.followingId === inviterId
      );
      const inviterFollowsAccepter = existingFollows.some(
        (f) => f.followerId === inviterId && f.followingId === accepterId
      );

      if (accepterFollowsInviter && inviterFollowsAccepter) {
        res.status(400).json({
          error: 'Already friends',
          code: 'ALREADY_FOLLOWING',
        });
        return;
      }

      // Create bidirectional follow relationships using a transaction
      await prisma.$transaction(async (tx) => {
        // Create accepter -> inviter follow if not exists
        if (!accepterFollowsInviter) {
          await tx.userFollow.create({
            data: {
              followerId: accepterId,
              followingId: inviterId,
            },
          });
        }

        // Create inviter -> accepter follow if not exists
        if (!inviterFollowsAccepter) {
          await tx.userFollow.create({
            data: {
              followerId: inviterId,
              followingId: accepterId,
            },
          });
        }
      });

      // Build inviter name for response
      const firstName = inviteLink.createdBy.firstName || '';
      const lastName = inviteLink.createdBy.lastName || '';
      const inviterName = `${firstName} ${lastName}`.trim() || 'Anonymous';

      res.json({
        success: true,
        message: 'You are now friends!',
        inviterName,
      });
    } catch (error) {
      console.error('Accept invite error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
