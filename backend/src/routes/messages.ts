import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import {
  validateMutualFriendship,
  validateMessageContent,
  getOrCreateConversation,
  normalizeParticipants,
  verifyConversationAccess,
  getOtherParticipant,
  formatUserName,
} from '../services/messageService';

const router = Router();

// Socket.io instance will be set from index.ts
let io: any = null;

export function setSocketIO(socketIO: any): void {
  io = socketIO;
}

/**
 * GET /api/friends/messages/meta/unread-count
 * Get total unread message count for the current user
 *
 * IMPORTANT: This route must be registered BEFORE /:friendId to avoid route collision
 */
router.get(
  '/meta/unread-count',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Find all conversations where user is participant
      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [{ participant1: userId }, { participant2: userId }],
        },
        include: {
          user1: { select: { id: true, firstName: true, lastName: true } },
          user2: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Count unread messages for each conversation
      let totalUnread = 0;
      const byConversation: Array<{
        conversationId: string;
        friendId: string;
        friendName: string;
        unreadCount: number;
      }> = [];

      for (const conv of conversations) {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            readAt: null,
            isDeleted: false,
          },
        });

        if (unreadCount > 0) {
          const friend = conv.participant1 === userId ? conv.user2 : conv.user1;
          totalUnread += unreadCount;

          byConversation.push({
            conversationId: conv.id,
            friendId: friend.id,
            friendName: formatUserName(friend),
            unreadCount,
          });
        }
      }

      res.json({ totalUnread, byConversation });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/friends/messages
 * Send a new message to a friend
 */
router.post(
  '/',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const senderId = req.user!.id;
      const { recipientId, content } = req.body;

      // Validate recipientId
      if (!recipientId || typeof recipientId !== 'string') {
        res.status(400).json({ error: 'recipientId is required' });
        return;
      }

      // Cannot message yourself
      if (senderId === recipientId) {
        res.status(400).json({ error: 'Cannot message yourself' });
        return;
      }

      // Validate and sanitize content
      let sanitizedContent: string;
      try {
        sanitizedContent = validateMessageContent(content);
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
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
        res.status(403).json({ error: 'Can only message mutual friends' });
        return;
      }

      // Get or create conversation
      const conversation = await getOrCreateConversation(senderId, recipientId);

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId,
          content: sanitizedContent,
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      // Emit WebSocket event to recipient
      if (io) {
        io.to(`user:${recipientId}`).emit('message:new', {
          message: {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            senderName: formatUserName(message.sender),
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            readAt: null,
          },
        });
      }

      res.status(201).json({
        message: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          readAt: null,
        },
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/friends/messages/:friendId
 * Get conversation messages with a specific friend
 * Uses cursor-based pagination
 */
router.get(
  '/:friendId',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { friendId } = req.params;
      const { cursor, limit: limitParam } = req.query;

      const limit = Math.min(parseInt(limitParam as string) || 50, 100);

      // Validate friendId
      if (!friendId || typeof friendId !== 'string') {
        res.status(400).json({ error: 'friendId is required' });
        return;
      }

      // Find conversation
      const [p1, p2] = normalizeParticipants(userId, friendId);
      const conversation = await prisma.conversation.findUnique({
        where: {
          participant1_participant2: { participant1: p1, participant2: p2 },
        },
      });

      if (!conversation) {
        // No conversation yet - valid state
        res.json({
          conversationId: null,
          messages: [],
          nextCursor: null,
          hasMore: false,
        });
        return;
      }

      // Build query
      const whereClause: any = {
        conversationId: conversation.id,
        isDeleted: false,
      };

      if (cursor && typeof cursor === 'string') {
        const cursorMessage = await prisma.message.findUnique({
          where: { id: cursor },
          select: { createdAt: true },
        });

        if (cursorMessage) {
          whereClause.createdAt = { lt: cursorMessage.createdAt };
        }
      }

      // Fetch messages (one extra to check hasMore)
      const messages = await prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        select: {
          id: true,
          senderId: true,
          content: true,
          createdAt: true,
          readAt: true,
        },
      });

      const hasMore = messages.length > limit;
      const resultMessages = hasMore ? messages.slice(0, limit) : messages;

      res.json({
        conversationId: conversation.id,
        messages: resultMessages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
          readAt: m.readAt?.toISOString() || null,
          isOwn: m.senderId === userId,
        })),
        nextCursor: hasMore
          ? resultMessages[resultMessages.length - 1].id
          : null,
        hasMore,
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /api/friends/messages/:conversationId/read
 * Mark all messages in a conversation as read
 */
router.patch(
  '/:conversationId/read',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { conversationId } = req.params;

      // Verify user is participant in conversation
      const conversation = await verifyConversationAccess(conversationId, userId);

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // Update unread messages from the other user
      const result = await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      // Optionally notify the sender that messages were read
      if (io && result.count > 0) {
        const otherUserId = getOtherParticipant(conversation, userId);
        io.to(`user:${otherUserId}`).emit('messages:read', {
          conversationId,
          readAt: new Date().toISOString(),
          readBy: userId,
        });
      }

      res.json({
        success: true,
        updatedCount: result.count,
      });
    } catch (error) {
      console.error('Mark read error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
