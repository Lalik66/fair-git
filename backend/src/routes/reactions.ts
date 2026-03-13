import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import { validateMutualFriendship, formatUserName } from '../services/messageService';

const router = Router();

// Socket.io instance will be set from index.ts
let io: any = null;

export function setSocketIO(socketIO: any): void {
  io = socketIO;
}

// Allowed emojis for reactions
const ALLOWED_EMOJIS = ['❤️', '🔥', '👀', '🎉', '😠', '👋', '💩', '❄️', '✈️'];

/**
 * POST /api/friends/reactions
 * Send a reaction to a friend
 */
router.post(
  '/',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const senderId = req.user!.id;
      const { recipientId, emoji } = req.body;

      // Validate recipientId
      if (!recipientId || typeof recipientId !== 'string') {
        res.status(400).json({ error: 'recipientId is required' });
        return;
      }

      // Cannot send reaction to yourself
      if (senderId === recipientId) {
        res.status(400).json({ error: 'Cannot send reaction to yourself' });
        return;
      }

      // Validate emoji
      if (!emoji || typeof emoji !== 'string') {
        res.status(400).json({ error: 'emoji is required' });
        return;
      }

      if (!ALLOWED_EMOJIS.includes(emoji)) {
        res.status(400).json({ error: 'Invalid emoji. Allowed emojis: ' + ALLOWED_EMOJIS.join(' ') });
        return;
      }

      // Check recipient exists and is active
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, isActive: true },
      });

      if (!recipient || !recipient.isActive) {
        res.status(404).json({ error: 'Recipient not found' });
        return;
      }

      // Validate mutual friendship
      const areFriends = await validateMutualFriendship(senderId, recipientId);
      if (!areFriends) {
        res.status(403).json({ error: 'Can only send reactions to mutual friends' });
        return;
      }

      // Get sender info for WebSocket event
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, firstName: true, lastName: true },
      });

      // Create reaction
      const reaction = await prisma.reaction.create({
        data: {
          senderId,
          recipientId,
          emoji,
        },
      });

      // Emit WebSocket event to recipient
      if (io && sender) {
        io.to(`user:${recipientId}`).emit('reaction:new', {
          reaction: {
            id: reaction.id,
            emoji: reaction.emoji,
            senderId: reaction.senderId,
            senderName: formatUserName(sender),
            createdAt: reaction.createdAt.toISOString(),
          },
        });
      }

      res.status(201).json({
        reaction: {
          id: reaction.id,
          emoji: reaction.emoji,
          senderId: reaction.senderId,
          recipientId: reaction.recipientId,
          createdAt: reaction.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Send reaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/friends/reactions/unread-count
 * Get count of reactions received from each friend
 */
router.get(
  '/unread-count',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Get reactions grouped by sender
      const reactions = await prisma.reaction.groupBy({
        by: ['senderId'],
        where: {
          recipientId: userId,
        },
        _count: {
          id: true,
        },
      });

      // Get sender details
      const senderIds = reactions.map((r) => r.senderId);
      const senders = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, firstName: true, lastName: true },
      });

      const senderMap = new Map(senders.map((s) => [s.id, s]));

      const byFriend = reactions.map((r) => {
        const sender = senderMap.get(r.senderId);
        return {
          friendId: r.senderId,
          friendName: sender ? formatUserName(sender) : 'Unknown',
          count: r._count.id,
        };
      });

      res.json({ byFriend });
    } catch (error) {
      console.error('Get reaction counts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /api/friends/reactions/mark-seen
 * Mark reactions from a friend (or all) as seen by deleting them
 */
router.patch(
  '/mark-seen',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { friendId } = req.body;

      const whereClause: any = {
        recipientId: userId,
      };

      if (friendId && typeof friendId === 'string') {
        whereClause.senderId = friendId;
      }

      // Delete reactions that have been seen
      const result = await prisma.reaction.deleteMany({
        where: whereClause,
      });

      res.json({
        success: true,
        clearedCount: result.count,
      });
    } catch (error) {
      console.error('Mark reactions seen error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
