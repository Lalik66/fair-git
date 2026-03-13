/**
 * Reactions Service
 * Handles API calls for friend reactions and WebSocket subscriptions
 */
import api from './api';
import { connectSocket } from './friendsMessagesService';

/**
 * Allowed emojis for reactions
 */
export const ALLOWED_EMOJIS = ['❤️', '🔥', '👀', '🎉', '😠', '👋', '💩', '❄️', '✈️'];

/**
 * Reaction data returned from the API
 */
export interface Reaction {
  id: string;
  emoji: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
}

/**
 * Send reaction response
 */
export interface SendReactionResponse {
  reaction: Reaction;
}

/**
 * Reaction count by friend
 */
export interface ReactionCountByFriend {
  friendId: string;
  friendName: string;
  count: number;
}

/**
 * Get reaction counts response
 */
export interface GetReactionCountsResponse {
  byFriend: ReactionCountByFriend[];
}

/**
 * Mark reactions seen response
 */
export interface MarkReactionsSeenResponse {
  success: boolean;
  clearedCount: number;
}

/**
 * WebSocket event payload for new reactions
 */
export interface NewReactionEvent {
  reaction: {
    id: string;
    emoji: string;
    senderId: string;
    senderName: string;
    createdAt: string;
  };
}

/**
 * Custom error class for reactions API errors
 */
export class ReactionsApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ReactionsApiError';
  }
}

/**
 * Send a reaction to a friend
 * @param recipientId The ID of the recipient
 * @param emoji The emoji to send
 * @returns The created reaction
 */
export async function sendReaction(
  recipientId: string,
  emoji: string
): Promise<SendReactionResponse> {
  try {
    const response = await api.post('/friends/reactions', {
      recipientId,
      emoji,
    });
    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as {
        response?: { status?: number; data?: { error?: string } };
      };
      const statusCode = axiosErr.response?.status;
      const errorMessage =
        axiosErr.response?.data?.error || 'Failed to send reaction';
      throw new ReactionsApiError(errorMessage, statusCode);
    }
    throw new ReactionsApiError('Failed to send reaction');
  }
}

/**
 * Get reaction counts grouped by friend
 * @returns Reaction counts per friend
 */
export async function getReactionCounts(): Promise<GetReactionCountsResponse> {
  try {
    const response = await api.get('/friends/reactions/unread-count');
    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as {
        response?: { status?: number; data?: { error?: string } };
      };
      const statusCode = axiosErr.response?.status;
      const errorMessage =
        axiosErr.response?.data?.error || 'Failed to get reaction counts';
      throw new ReactionsApiError(errorMessage, statusCode);
    }
    throw new ReactionsApiError('Failed to get reaction counts');
  }
}

/**
 * Mark reactions as seen (deletes them)
 * @param friendId Optional - clear reactions from specific friend, otherwise clears all
 * @returns Success status and count of cleared reactions
 */
export async function markReactionsSeen(
  friendId?: string
): Promise<MarkReactionsSeenResponse> {
  try {
    const response = await api.patch('/friends/reactions/mark-seen', {
      friendId,
    });
    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as {
        response?: { status?: number; data?: { error?: string } };
      };
      const statusCode = axiosErr.response?.status;
      const errorMessage =
        axiosErr.response?.data?.error || 'Failed to mark reactions as seen';
      throw new ReactionsApiError(errorMessage, statusCode);
    }
    throw new ReactionsApiError('Failed to mark reactions as seen');
  }
}

/**
 * Subscribe to new reactions via WebSocket
 * @param callback Function to call when a new reaction is received
 * @returns Cleanup function to unsubscribe
 */
export function onReactionNew(
  callback: (event: NewReactionEvent) => void
): () => void {
  const sock = connectSocket();
  sock.on('reaction:new', callback);
  return () => {
    sock.off('reaction:new', callback);
  };
}

export default {
  // REST API
  sendReaction,
  getReactionCounts,
  markReactionsSeen,
  // WebSocket
  onReactionNew,
  // Constants
  ALLOWED_EMOJIS,
};
