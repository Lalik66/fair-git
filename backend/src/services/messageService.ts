import { Prisma } from '@prisma/client';
import { prisma } from '../index';

/**
 * Message service for handling messaging business logic
 */

/**
 * Normalize participant IDs for conversation lookup/creation
 * Always puts lexicographically smaller ID as participant1
 */
export function normalizeParticipants(
  userId1: string,
  userId2: string
): [string, string] {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

/**
 * Validate that two users are mutual friends (both follow each other)
 */
export async function validateMutualFriendship(
  userId1: string,
  userId2: string
): Promise<boolean> {
  const follows = await prisma.userFollow.findMany({
    where: {
      OR: [
        { followerId: userId1, followingId: userId2 },
        { followerId: userId2, followingId: userId1 },
      ],
    },
  });

  // Both directions must exist for mutual friendship
  const user1FollowsUser2 = follows.some(
    (f) => f.followerId === userId1 && f.followingId === userId2
  );
  const user2FollowsUser1 = follows.some(
    (f) => f.followerId === userId2 && f.followingId === userId1
  );

  return user1FollowsUser2 && user2FollowsUser1;
}

/**
 * Validate message content
 * Returns the raw trimmed content or throws an error
 */
export function validateMessageContent(content: unknown): string {
  if (typeof content !== 'string') {
    throw new Error('Content must be a string');
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    throw new Error('Message cannot be empty');
  }

  if (trimmed.length > 1000) {
    throw new Error('Message exceeds 1000 character limit');
  }

  // Store the raw message. Output encoding is the renderer's job: the chat
  // UIs (FriendChatPanel, AIChatPanel) display content as plain-text JSX, so
  // React escapes it on render. Escaping here would double-encode (users
  // would see &amp; / &lt;).
  // See docs/deploy-notes.md — double-encode migration (chat message content)
  return trimmed;
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<{ id: string; participant1: string; participant2: string }> {
  const [p1, p2] = normalizeParticipants(userId1, userId2);

  // Try to find existing conversation
  let conversation = await prisma.conversation.findUnique({
    where: {
      participant1_participant2: { participant1: p1, participant2: p2 },
    },
  });

  // Create if not exists. Two concurrent first-messages between the same pair
  // can both find null and both try to create; the second hits the
  // @@unique([participant1, participant2]) constraint (P2002). Treat that as a
  // benign race and re-fetch the row the other request just created.
  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({
        data: {
          participant1: p1,
          participant2: p2,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        conversation = await prisma.conversation.findUnique({
          where: {
            participant1_participant2: { participant1: p1, participant2: p2 },
          },
        });
      } else {
        throw err;
      }
    }
  }

  if (!conversation) {
    throw new Error('Failed to get or create conversation');
  }

  return conversation;
}

/**
 * Get conversation by participants (returns null if not exists)
 */
export async function getConversationByParticipants(
  userId1: string,
  userId2: string
): Promise<{ id: string; participant1: string; participant2: string } | null> {
  const [p1, p2] = normalizeParticipants(userId1, userId2);

  return prisma.conversation.findUnique({
    where: {
      participant1_participant2: { participant1: p1, participant2: p2 },
    },
  });
}

/**
 * Verify user is a participant in a conversation
 */
export async function verifyConversationAccess(
  conversationId: string,
  userId: string
): Promise<{
  id: string;
  participant1: string;
  participant2: string;
} | null> {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participant1: userId }, { participant2: userId }],
    },
  });
}

/**
 * Get the other participant ID from a conversation
 */
export function getOtherParticipant(
  conversation: { participant1: string; participant2: string },
  userId: string
): string {
  return conversation.participant1 === userId
    ? conversation.participant2
    : conversation.participant1;
}

/**
 * Format user name from first and last name
 */
export function formatUserName(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  return `${firstName} ${lastName}`.trim() || 'Anonymous';
}
