/**
 * Friends Messages Service
 * Handles API calls for friend messaging and WebSocket connections
 */
import api from './api';
import { io, Socket } from 'socket.io-client';

/**
 * Message data returned from the API
 */
export interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  isOwn: boolean;
}

/**
 * Send message request
 */
export interface SendMessageRequest {
  recipientId: string;
  content: string;
}

/**
 * Send message response
 */
export interface SendMessageResponse {
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: string;
    readAt: null;
  };
}

/**
 * Get messages response
 */
export interface GetMessagesResponse {
  conversationId: string | null;
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Unread count item
 */
export interface UnreadConversation {
  conversationId: string;
  friendId: string;
  friendName: string;
  unreadCount: number;
}

/**
 * Unread count response
 */
export interface UnreadCountResponse {
  totalUnread: number;
  byConversation: UnreadConversation[];
}

/**
 * Mark as read response
 */
export interface MarkAsReadResponse {
  success: boolean;
  updatedCount: number;
}

/**
 * WebSocket event payloads
 */
export interface NewMessageEvent {
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    content: string;
    createdAt: string;
    readAt: null;
  };
}

export interface TypingEvent {
  userId: string;
  conversationId: string;
}

export interface MessagesReadEvent {
  conversationId: string;
  readAt: string;
  readBy: string;
}

/**
 * Custom error class for messages API errors
 */
export class MessagesApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'MessagesApiError';
  }
}

// Socket instance for real-time messaging
let socket: Socket | null = null;

/**
 * Connect to WebSocket server
 * @returns Socket instance
 */
export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    throw new MessagesApiError('No authentication token available');
  }

  // Socket.io needs backend base URL (not /api path). Use VITE_WS_URL or derive from VITE_API_URL.
  const baseUrl =
    import.meta.env.VITE_WS_URL ||
    (import.meta.env.VITE_API_URL && typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL.startsWith('http')
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
      : 'http://localhost:3002');

  socket = io(baseUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  return socket;
}

/**
 * Disconnect from WebSocket server
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get current socket instance
 * @returns Socket instance or null
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Subscribe to new messages
 * @param callback Function to call when a new message is received
 * @returns Cleanup function to unsubscribe
 */
export function onNewMessage(callback: (event: NewMessageEvent) => void): () => void {
  const sock = connectSocket();
  sock.on('message:new', callback);
  return () => {
    sock.off('message:new', callback);
  };
}

/**
 * Subscribe to typing start events
 * @param callback Function to call when someone starts typing
 * @returns Cleanup function to unsubscribe
 */
export function onTypingStart(callback: (event: TypingEvent) => void): () => void {
  const sock = connectSocket();
  sock.on('typing:start', callback);
  return () => {
    sock.off('typing:start', callback);
  };
}

/**
 * Subscribe to typing stop events
 * @param callback Function to call when someone stops typing
 * @returns Cleanup function to unsubscribe
 */
export function onTypingStop(callback: (event: TypingEvent) => void): () => void {
  const sock = connectSocket();
  sock.on('typing:stop', callback);
  return () => {
    sock.off('typing:stop', callback);
  };
}

/**
 * Subscribe to messages read events
 * @param callback Function to call when messages are read
 * @returns Cleanup function to unsubscribe
 */
export function onMessagesRead(callback: (event: MessagesReadEvent) => void): () => void {
  const sock = connectSocket();
  sock.on('messages:read', callback);
  return () => {
    sock.off('messages:read', callback);
  };
}

/**
 * Emit typing start event
 * @param conversationId The conversation ID
 */
export function emitTypingStart(conversationId: string): void {
  const sock = getSocket();
  if (sock?.connected) {
    sock.emit('typing:start', { conversationId });
  }
}

/**
 * Emit typing stop event
 * @param conversationId The conversation ID
 */
export function emitTypingStop(conversationId: string): void {
  const sock = getSocket();
  if (sock?.connected) {
    sock.emit('typing:stop', { conversationId });
  }
}

/**
 * Send a message to a friend
 * @param recipientId The ID of the recipient
 * @param content The message content
 * @returns The created message
 */
export async function sendMessage(
  recipientId: string,
  content: string
): Promise<SendMessageResponse> {
  try {
    const response = await api.post('/friends/messages', {
      recipientId,
      content,
    });
    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as {
        response?: { status?: number; data?: { error?: string } };
      };
      const statusCode = axiosErr.response?.status;
      const errorMessage =
        axiosErr.response?.data?.error || 'Failed to send message';
      throw new MessagesApiError(errorMessage, statusCode);
    }
    throw new MessagesApiError('Failed to send message');
  }
}

/**
 * Get messages with a specific friend
 * @param friendId The ID of the friend
 * @param cursor Optional cursor for pagination
 * @param limit Optional limit for number of messages (default 50, max 100)
 * @returns Messages and pagination info
 */
export async function getMessages(
  friendId: string,
  cursor?: string,
  limit?: number
): Promise<GetMessagesResponse> {
  try {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = `/friends/messages/${friendId}${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as {
        response?: { status?: number; data?: { error?: string } };
      };
      const statusCode = axiosErr.response?.status;
      const errorMessage =
        axiosErr.response?.data?.error || 'Failed to get messages';
      throw new MessagesApiError(errorMessage, statusCode);
    }
    throw new MessagesApiError('Failed to get messages');
  }
}

/**
 * Mark all messages in a conversation as read
 * @param conversationId The conversation ID
 * @returns Success status and count of updated messages
 */
export async function markAsRead(
  conversationId: string
): Promise<MarkAsReadResponse> {
  try {
    const response = await api.patch(
      `/friends/messages/${conversationId}/read`
    );
    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as {
        response?: { status?: number; data?: { error?: string } };
      };
      const statusCode = axiosErr.response?.status;
      const errorMessage =
        axiosErr.response?.data?.error || 'Failed to mark messages as read';
      throw new MessagesApiError(errorMessage, statusCode);
    }
    throw new MessagesApiError('Failed to mark messages as read');
  }
}

/**
 * Get total unread message count
 * @returns Unread count details
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  try {
    const response = await api.get('/friends/messages/meta/unread-count');
    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as {
        response?: { status?: number; data?: { error?: string } };
      };
      const statusCode = axiosErr.response?.status;
      const errorMessage =
        axiosErr.response?.data?.error || 'Failed to get unread count';
      throw new MessagesApiError(errorMessage, statusCode);
    }
    throw new MessagesApiError('Failed to get unread count');
  }
}

export default {
  // REST API
  sendMessage,
  getMessages,
  markAsRead,
  getUnreadCount,
  // WebSocket
  connectSocket,
  disconnectSocket,
  getSocket,
  onNewMessage,
  onTypingStart,
  onTypingStop,
  onMessagesRead,
  emitTypingStart,
  emitTypingStop,
};
