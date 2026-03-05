import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { verifyConversationAccess, getOtherParticipant } from '../services/messageService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

/**
 * Initialize WebSocket server with Socket.io
 */
export function initializeWebSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Support both auth object and query param for token
      const token =
        socket.handshake.auth.token ||
        (socket.handshake.query.token as string);

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as { userId: string };

      if (!decoded.userId) {
        return next(new Error('Invalid token'));
      }

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      // Attach user ID to socket
      socket.userId = user.id;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;

    if (!userId) {
      socket.disconnect(true);
      return;
    }

    // Join user-specific room
    socket.join(`user:${userId}`);
    console.log(`User ${userId} connected via WebSocket`);

    // Handle typing indicators
    socket.on('typing:start', async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;

        if (!conversationId) return;

        // Verify user is participant
        const conversation = await verifyConversationAccess(
          conversationId,
          userId
        );
        if (!conversation) return;

        // Get the other participant
        const friendId = getOtherParticipant(conversation, userId);

        // Emit to friend's room
        io.to(`user:${friendId}`).emit('typing:start', {
          userId,
          conversationId,
        });
      } catch (error) {
        console.error('Typing start error:', error);
      }
    });

    socket.on('typing:stop', async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;

        if (!conversationId) return;

        // Verify user is participant
        const conversation = await verifyConversationAccess(
          conversationId,
          userId
        );
        if (!conversation) return;

        // Get the other participant
        const friendId = getOtherParticipant(conversation, userId);

        // Emit to friend's room
        io.to(`user:${friendId}`).emit('typing:stop', {
          userId,
          conversationId,
        });
      } catch (error) {
        console.error('Typing stop error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
}
