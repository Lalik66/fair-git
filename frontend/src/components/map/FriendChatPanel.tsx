import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getMessages,
  sendMessage,
  markAsRead,
  connectSocket,
  disconnectSocket,
  onNewMessage,
  onTypingStart,
  onTypingStop,
  emitTypingStart,
  emitTypingStop,
  Message,
  NewMessageEvent,
  TypingEvent,
} from '../../services/friendsMessagesService';
import './FriendChatPanel.css';

interface Friend {
  id: string;
  name: string;
  isOnline: boolean;
  avatarColor: string;
}

interface FriendChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  friend: Friend;
  isMobile: boolean;
}

const FriendChatPanel: React.FC<FriendChatPanelProps> = ({
  isOpen,
  onClose,
  onBack,
  friend,
  isMobile,
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get avatar letter
  const getAvatarLetter = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  // Format message time
  const formatMessageTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    // Today: show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `${t('chat.yesterday')} ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }

    // This week
    if (diffHours < 24 * 7) {
      return date.toLocaleDateString([], {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    // Older
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load messages
  const loadMessages = useCallback(async (cursor?: string) => {
    if (!friend.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getMessages(friend.id, cursor);

      if (cursor) {
        // Append older messages
        setMessages((prev) => [...prev, ...response.messages]);
      } else {
        // Initial load - messages come newest first, reverse for display
        setMessages(response.messages.reverse());
        setConversationId(response.conversationId);

        // Mark as read if there are messages
        if (response.conversationId) {
          markAsRead(response.conversationId).catch(console.error);
        }
      }

      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError(t('chat.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [friend.id, t]);

  // Load messages on open
  useEffect(() => {
    if (isOpen && friend.id) {
      loadMessages();
    }
  }, [isOpen, friend.id, loadMessages]);

  // Scroll to bottom when messages change (initial load or new message)
  useEffect(() => {
    if (messages.length > 0 && !nextCursor) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom, nextCursor]);

  // Connect to WebSocket and handle events
  useEffect(() => {
    if (!isOpen) return;

    try {
      connectSocket();
    } catch (err) {
      console.error('Failed to connect socket:', err);
    }

    // Handle new messages
    const unsubNewMessage = onNewMessage((event: NewMessageEvent) => {
      // Only add if it's for this conversation
      if (event.message.conversationId === conversationId) {
        const newMsg: Message = {
          id: event.message.id,
          senderId: event.message.senderId,
          content: event.message.content,
          createdAt: event.message.createdAt,
          readAt: null,
          isOwn: false,
        };
        setMessages((prev) => [...prev, newMsg]);

        // Mark as read immediately since chat is open
        if (conversationId) {
          markAsRead(conversationId).catch(console.error);
        }
      }
    });

    // Handle typing start
    const unsubTypingStart = onTypingStart((event: TypingEvent) => {
      if (event.conversationId === conversationId && event.userId === friend.id) {
        setIsTyping(true);
      }
    });

    // Handle typing stop
    const unsubTypingStop = onTypingStop((event: TypingEvent) => {
      if (event.conversationId === conversationId && event.userId === friend.id) {
        setIsTyping(false);
      }
    });

    return () => {
      unsubNewMessage();
      unsubTypingStart();
      unsubTypingStop();
    };
  }, [isOpen, conversationId, friend.id]);

  // Disconnect socket on close
  useEffect(() => {
    if (!isOpen) {
      disconnectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Handle typing indicator with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    if (conversationId) {
      // Emit typing start
      emitTypingStart(conversationId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to emit typing stop
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStop(conversationId);
      }, 2000);
    }
  };

  // Handle send message
  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isSending) return;

    // Stop typing indicator
    if (conversationId && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      emitTypingStop(conversationId);
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await sendMessage(friend.id, content);

      // Add sent message to list
      const sentMsg: Message = {
        id: response.message.id,
        senderId: response.message.senderId,
        content: response.message.content,
        createdAt: response.message.createdAt,
        readAt: null,
        isOwn: true,
      };
      setMessages((prev) => [...prev, sentMsg]);

      // Update conversation ID if this was first message
      if (!conversationId) {
        setConversationId(response.message.conversationId);
      }

      setInputValue('');
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(t('chat.sendFailed'));
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Load more messages (scroll to top)
  const handleLoadMore = () => {
    if (hasMore && nextCursor && !isLoading) {
      loadMessages(nextCursor);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`friend-chat-backdrop ${isMobile ? 'mobile' : 'desktop'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`friend-chat-panel ${isMobile ? 'mobile' : 'desktop'}`}
        role="dialog"
        aria-label={t('chat.panelLabel', { name: friend.name })}
        aria-modal="true"
      >
        {/* Header */}
        <div className="friend-chat-header">
          <button
            className="friend-chat-back-btn"
            onClick={onBack}
            aria-label={t('chat.backToFriends')}
          >
            <span aria-hidden="true">&larr;</span>
          </button>

          <div className="friend-chat-header-info">
            <div className="friend-chat-avatar-wrapper">
              <div
                className="friend-chat-avatar"
                style={{ backgroundColor: friend.avatarColor }}
              >
                {getAvatarLetter(friend.name)}
              </div>
              <span
                className={`friend-chat-status-dot ${friend.isOnline ? 'online' : 'offline'}`}
              />
            </div>
            <h3 className="friend-chat-name">{friend.name}</h3>
          </div>

          <button
            className="friend-chat-close-btn"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        {/* Messages */}
        <div
          className="friend-chat-messages"
          ref={messagesContainerRef}
          role="log"
          aria-live="polite"
          aria-label={t('chat.messagesLabel')}
        >
          {/* Load more button */}
          {hasMore && (
            <button
              className="friend-chat-load-more"
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading ? t('chat.loadingMessages') : t('chat.loadMore')}
            </button>
          )}

          {/* Loading state */}
          {isLoading && messages.length === 0 && (
            <div className="friend-chat-loading">
              <div className="friend-chat-spinner"></div>
              <span className="friend-chat-loading-text">{t('chat.loadingMessages')}</span>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && messages.length === 0 && (
            <div className="friend-chat-empty">
              <span className="friend-chat-empty-icon" aria-hidden="true">
                💬
              </span>
              <h4 className="friend-chat-empty-title">{t('chat.emptyTitle')}</h4>
              <p className="friend-chat-empty-subtitle">
                {t('chat.emptySubtitle', { name: friend.name })}
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="friend-chat-error">
              <span className="friend-chat-error-icon" aria-hidden="true">
                ⚠️
              </span>
              <p className="friend-chat-error-text">{error}</p>
              <button
                className="friend-chat-retry-btn"
                onClick={() => loadMessages()}
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* Messages list */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`friend-chat-message ${msg.isOwn ? 'sent' : 'received'}`}
              role="article"
            >
              <div className="friend-chat-bubble">{msg.content}</div>
              <div className="friend-chat-message-meta">
                <span className="friend-chat-timestamp">
                  {formatMessageTime(msg.createdAt)}
                </span>
                {msg.isOwn && (
                  <span
                    className={`friend-chat-read-indicator ${msg.readAt ? 'read' : 'unread'}`}
                  >
                    {msg.readAt ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div
              className="friend-chat-typing-indicator"
              role="status"
              aria-label={t('chat.friendIsTyping', { name: friend.name })}
            >
              <div className="friend-chat-typing-bubble">
                <span className="friend-chat-typing-dot"></span>
                <span className="friend-chat-typing-dot"></span>
                <span className="friend-chat-typing-dot"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="friend-chat-input-area">
          <textarea
            ref={inputRef}
            className="friend-chat-input"
            placeholder={t('chat.inputPlaceholder')}
            aria-label={t('chat.inputLabel')}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={1000}
          />
          <button
            className="friend-chat-send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            aria-label={t('chat.sendMessage')}
          >
            <span className="friend-chat-send-icon" aria-hidden="true">
              ➤
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default FriendChatPanel;
