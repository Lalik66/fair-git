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

    // Locate everyone who follows this user and pre-join the senders into
    // their followers' notification rooms. Cheaper than a per-event DB lookup
    // on every location tick.
    (async () => {
      try {
        const followers = await prisma.userFollow.findMany({
          where: { followingId: userId },
          select: { followerId: true },
        });
        // The sender broadcasts to room `followers-of:<their userId>`. Each
        // follower joins that room on their own connection — see below.
        const following = await prisma.userFollow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        });
        for (const f of following) {
          socket.join(`followers-of:${f.followingId}`);
        }
        // Touch followers count for logging clarity — not used otherwise.
        if (followers.length || following.length) {
          // no-op: documented for future debugging
        }
      } catch (err) {
        console.error('socket follow-room join error:', err);
      }
    })();

    /**
     * Live location broadcast.
     * Client emits: { lat, lng }
     * Server validates sharing flag, writes through to DB so the polling
     * fallback keeps working, then fans out to followers.
     */
    socket.on('location:update', async (data: { lat: number; lng: number }) => {
      try {
        const { lat, lng } = data ?? {};
        if (
          typeof lat !== 'number' ||
          typeof lng !== 'number' ||
          !Number.isFinite(lat) || !Number.isFinite(lng) ||
          lat < -90 || lat > 90 ||
          lng < -180 || lng > 180
        ) {
          return;
        }

        // Privacy gate. We re-read on every tick so toggling off takes effect
        // immediately without waiting for the socket to reconnect.
        const sender = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            isSharingLocation: true,
            firstName: true,
            lastName: true,
          },
        });
        if (!sender?.isSharingLocation) return;

        const now = new Date();
        await prisma.user.update({
          where: { id: userId },
          data: {
            lastLatitude: lat,
            lastLongitude: lng,
            locationUpdatedAt: now,
          },
        });

        const firstName = sender.firstName || '';
        const lastName = sender.lastName || '';
        const name = `${firstName} ${lastName}`.trim() || 'Anonymous';

        io.to(`followers-of:${userId}`).emit('friend:location', {
          id: userId,
          name,
          lastLatitude: lat,
          lastLongitude: lng,
          locationUpdatedAt: now.toISOString(),
        });
      } catch (err) {
        console.error('location:update error:', err);
      }
    });

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
