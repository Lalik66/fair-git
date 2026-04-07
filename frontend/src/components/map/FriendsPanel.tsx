import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { distance, point } from '@turf/turf';
import { getFollowing, getFriendLocations, FollowingUser, FriendLocation } from '../../services/friendsService';
import { getUnreadCount, UnreadConversation } from '../../services/friendsMessagesService';
import { getReactionCounts, sendReaction, onReactionNew, NewReactionEvent } from '../../services/reactionsService';
import { inviteApi } from '../../services/api';
import FriendChatPanel from './FriendChatPanel';
import ReactionPicker from '../ReactionPicker';
import { getAvatarLetter, getAvatarColor } from '../../utils/avatarHelpers';
import './FriendsPanel.css';
import '../ReactionPicker.css';

// Online threshold: 30 minutes in milliseconds
const ONLINE_THRESHOLD_MS = 30 * 60 * 1000;

type SortOption = 'online' | 'closest' | 'name';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  userLocation?: UserLocation | null;
  onFlyToFriend?: (lng: number, lat: number) => void;
  /** When set, use these instead of fetching locations (same data as map polling). */
  friendLocations?: FriendLocation[];
  /** Loading state for `friendLocations` when provided by parent. */
  friendLocationsLoading?: boolean;
}

// Extended friend type with merged location data
interface FriendWithStatus extends FollowingUser {
  isOnline: boolean;
  lastLatitude?: number;
  lastLongitude?: number;
  locationUpdatedAt?: string;
  distanceKm?: number;
  unreadCount?: number;
  reactionCount?: number;
}

// Chat friend data
interface ChatFriend {
  id: string;
  name: string;
  isOnline: boolean;
  avatarColor: string;
}

const FriendsPanel: React.FC<FriendsPanelProps> = ({
  isOpen,
  onClose,
  isMobile,
  userLocation,
  onFlyToFriend,
  friendLocations: friendLocationsProp,
  friendLocationsLoading = false,
}) => {
  const { t } = useTranslation();
  const [friends, setFriends] = useState<FollowingUser[]>([]);
  const [localFriendLocations, setLocalFriendLocations] = useState<FriendLocation[]>([]);
  const [unreadByFriend, setUnreadByFriend] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const useSharedLocations = friendLocationsProp !== undefined;
  const friendLocations = useSharedLocations ? friendLocationsProp : localFriendLocations;
  const listLoading = isLoading || (useSharedLocations && friendLocationsLoading);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('online');
  const [chatFriend, setChatFriend] = useState<ChatFriend | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [reactionsByFriend, setReactionsByFriend] = useState<Map<string, number>>(new Map());
  const [reactionPickerFriend, setReactionPickerFriend] = useState<{ id: string; name: string } | null>(null);

  // Fetch friends list when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchFriendsData();
    }
  }, [isOpen]);

  // Auto-dismiss message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Close panel on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const fetchFriendsData = async () => {
    setIsLoading(true);
    try {
      const followingList = await getFollowing();
      setFriends(followingList);

      if (!useSharedLocations) {
        const locations = await getFriendLocations().catch(() => [] as FriendLocation[]);
        setLocalFriendLocations(locations);
      }

      const [unreadData, reactionsData] = await Promise.all([
        getUnreadCount().catch(() => ({ totalUnread: 0, byConversation: [] })),
        getReactionCounts().catch(() => ({ byFriend: [] })),
      ]);

      const unreadMap = new Map<string, number>();
      unreadData.byConversation.forEach((conv: UnreadConversation) => {
        unreadMap.set(conv.friendId, conv.unreadCount);
      });
      setUnreadByFriend(unreadMap);

      const reactionsMap = new Map<string, number>();
      reactionsData.byFriend.forEach((r: { friendId: string; count: number }) => {
        reactionsMap.set(r.friendId, r.count);
      });
      setReactionsByFriend(reactionsMap);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a friend is online based on locationUpdatedAt
  const isOnline = useCallback((locationUpdatedAt?: string): boolean => {
    if (!locationUpdatedAt) return false;
    const updatedAt = new Date(locationUpdatedAt).getTime();
    const now = Date.now();
    return now - updatedAt < ONLINE_THRESHOLD_MS;
  }, []);

  // Calculate distance between user and friend
  const calculateDistance = useCallback(
    (friendLat: number, friendLng: number): number | undefined => {
      if (!userLocation) return undefined;
      try {
        const from = point([userLocation.longitude, userLocation.latitude]);
        const to = point([friendLng, friendLat]);
        return distance(from, to, { units: 'kilometers' });
      } catch {
        return undefined;
      }
    },
    [userLocation]
  );

  // Format last seen time
  const formatLastSeen = useCallback((locationUpdatedAt: string): string => {
    const updatedAt = new Date(locationUpdatedAt).getTime();
    const now = Date.now();
    const diffMs = now - updatedAt;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else {
      return `${diffDays}d`;
    }
  }, []);

  // Merge friends with location data and unread counts
  const friendsWithStatus: FriendWithStatus[] = useMemo(() => {
    const locationMap = new Map<string, FriendLocation>();
    friendLocations.forEach((loc) => {
      locationMap.set(loc.id, loc);
    });

    return friends.map((friend) => {
      const location = locationMap.get(friend.id);
      const online = isOnline(location?.locationUpdatedAt);
      const distanceKm =
        location && online
          ? calculateDistance(location.lastLatitude, location.lastLongitude)
          : undefined;

      return {
        ...friend,
        isOnline: online,
        lastLatitude: location?.lastLatitude,
        lastLongitude: location?.lastLongitude,
        locationUpdatedAt: location?.locationUpdatedAt,
        distanceKm,
        unreadCount: unreadByFriend.get(friend.id),
        reactionCount: reactionsByFriend.get(friend.id),
      };
    });
  }, [friends, friendLocations, isOnline, calculateDistance, unreadByFriend, reactionsByFriend]);

  // Sort friends based on selected option
  const sortedFriends = useMemo(() => {
    const sorted = [...friendsWithStatus];

    switch (sortOption) {
      case 'online':
        // Online first, then by name
        sorted.sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return a.name.localeCompare(b.name);
        });
        break;
      case 'closest':
        // Closest first (friends without distance go to the end)
        sorted.sort((a, b) => {
          if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
            return a.distanceKm - b.distanceKm;
          }
          if (a.distanceKm !== undefined) return -1;
          if (b.distanceKm !== undefined) return 1;
          return a.name.localeCompare(b.name);
        });
        break;
      case 'name':
        // Alphabetical by name
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }, [friendsWithStatus, sortOption]);

  // Copy URL to clipboard helper
  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ type: 'success', text: t('friends.invite.copied') });
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setMessage({ type: 'success', text: t('friends.invite.copied') });
    }
  };

  // Handle invite friend (reuses existing flow)
  const handleInviteFriend = useCallback(async () => {
    setInviteLoading(true);
    setMessage(null);

    try {
      const result = await inviteApi.create();

      // Try Web Share API first
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Fair Marketplace - Friend Invite',
            text: 'Join me on Fair Marketplace to see my location on the map!',
            url: result.url,
          });
          setMessage({ type: 'success', text: t('friends.invite.shared') });
        } catch (shareErr: unknown) {
          // User cancelled share or share failed - fall back to clipboard
          if (shareErr instanceof Error && shareErr.name !== 'AbortError') {
            await copyToClipboard(result.url);
          }
        }
      } else {
        // Fall back to clipboard
        await copyToClipboard(result.url);
      }
    } catch (err: unknown) {
      console.error('Failed to create invite:', err);
      setMessage({ type: 'error', text: t('friends.invite.failed') });
    } finally {
      setInviteLoading(false);
    }
  }, [t]);

  // Handle show on map click
  const handleShowOnMap = useCallback(
    (friend: FriendWithStatus) => {
      if (friend.lastLongitude && friend.lastLatitude && onFlyToFriend) {
        onFlyToFriend(friend.lastLongitude, friend.lastLatitude);
        onClose();
      }
    },
    [onFlyToFriend, onClose]
  );

  // Handle open chat
  const handleOpenChat = useCallback(
    (friend: FriendWithStatus) => {
      setChatFriend({
        id: friend.id,
        name: friend.name,
        isOnline: friend.isOnline,
        avatarColor: getAvatarColor(friend.name),
      });
      setIsChatOpen(true);
    },
    []
  );

  // Handle close chat
  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
    setChatFriend(null);
    // Refresh unread counts when chat closes
    getUnreadCount()
      .then((data) => {
        const unreadMap = new Map<string, number>();
        data.byConversation.forEach((conv: UnreadConversation) => {
          unreadMap.set(conv.friendId, conv.unreadCount);
        });
        setUnreadByFriend(unreadMap);
      })
      .catch(console.error);
  }, []);

  // Handle back from chat to friends list
  const handleBackFromChat = useCallback(() => {
    setIsChatOpen(false);
    setChatFriend(null);
    // Refresh unread counts when returning to friends list
    getUnreadCount()
      .then((data) => {
        const unreadMap = new Map<string, number>();
        data.byConversation.forEach((conv: UnreadConversation) => {
          unreadMap.set(conv.friendId, conv.unreadCount);
        });
        setUnreadByFriend(unreadMap);
      })
      .catch(console.error);
  }, []);

  // Handle open reaction picker for a friend
  const handleOpenReactionPicker = useCallback((friend: FriendWithStatus) => {
    setReactionPickerFriend({ id: friend.id, name: friend.name });
  }, []);

  // Handle emoji selection and send reaction
  const handleReactionSelect = useCallback(async (emoji: string) => {
    if (!reactionPickerFriend) return;

    try {
      await sendReaction(reactionPickerFriend.id, emoji);
      setMessage({ type: 'success', text: t('reactions.sent') });
      setReactionPickerFriend(null);
    } catch (error) {
      console.error('Failed to send reaction:', error);
      setMessage({ type: 'error', text: String(error) });
      setReactionPickerFriend(null);
    }
  }, [reactionPickerFriend, t]);

  // Close reaction picker
  const handleCloseReactionPicker = useCallback(() => {
    setReactionPickerFriend(null);
  }, []);

  // Subscribe to WebSocket reaction events when panel is open
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = onReactionNew((event: NewReactionEvent) => {
      // Update reaction counts when a new reaction is received
      setReactionsByFriend((prev) => {
        const newMap = new Map(prev);
        const senderId = event.reaction.senderId;
        const currentCount = newMap.get(senderId) || 0;
        newMap.set(senderId, currentCount + 1);
        return newMap;
      });
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Format distance for display
  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return distanceKm.toFixed(1);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for modal mode */}
      <div
        className={`friends-panel-backdrop ${isMobile ? 'mobile' : 'desktop'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`friends-panel ${isMobile ? 'mobile' : 'desktop'}`}>
        {/* Header */}
        <div className="friends-panel-header">
          <h2 className="friends-panel-title">{t('friends.panel.title')}</h2>
          <button className="friends-panel-close" onClick={onClose} aria-label="Close">
            <span>&times;</span>
          </button>
        </div>

        {/* Add Friend Button - prominent green 2GIS-style */}
        <div className="friends-panel-add-section">
          <button
            className="friends-add-btn"
            onClick={handleInviteFriend}
            disabled={inviteLoading}
          >
            {inviteLoading ? (
              <span className="friends-add-loading"></span>
            ) : (
              <span className="friends-add-icon">+</span>
            )}
            <span className="friends-add-text">{t('friends.panel.addButton')}</span>
          </button>
        </div>

        {/* Sort Options */}
        {friends.length > 0 && (
          <div className="friends-sort-section">
            <label className="friends-sort-label">{t('friends.sort.label')}:</label>
            <select
              className="friends-sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
            >
              <option value="online">{t('friends.sort.online')}</option>
              <option value="closest">{t('friends.sort.closest')}</option>
              <option value="name">{t('friends.sort.name')}</option>
            </select>
          </div>
        )}

        {/* Message Toast */}
        {message && (
          <div className={`friends-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Friends List */}
        <div className="friends-panel-list">
          {listLoading ? (
            <div className="friends-list-loading">
              <div className="spinner"></div>
            </div>
          ) : sortedFriends.length === 0 ? (
            <div className="friends-list-empty">
              <div className="empty-icon">👥</div>
              <p>{t('friends.panel.empty')}</p>
            </div>
          ) : (
            <div className="friends-list">
              {sortedFriends.map((friend) => (
                <div key={friend.id} className="friend-item">
                  <div className="friend-avatar-wrapper">
                    <div
                      className="friend-avatar"
                      style={{ backgroundColor: getAvatarColor(friend.name) }}
                    >
                      {getAvatarLetter(friend.name)}
                    </div>
                    <span
                      className={`friend-status-dot ${friend.isOnline ? 'online' : 'offline'}`}
                      title={friend.isOnline ? t('friends.card.online') : t('friends.card.offline')}
                    />
                    {friend.unreadCount && friend.unreadCount > 0 && (
                      <span className="friend-unread-badge" data-count={friend.unreadCount > 9 ? '9+' : friend.unreadCount}>
                        {friend.unreadCount > 9 ? '9+' : friend.unreadCount}
                      </span>
                    )}
                    {friend.reactionCount && friend.reactionCount > 0 && (
                      <span
                        className="friend-reaction-badge"
                        title={t('reactions.reactionBadge', { count: friend.reactionCount })}
                      >
                        {friend.reactionCount > 9 ? '9+' : friend.reactionCount}
                      </span>
                    )}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name">{friend.name}</div>
                    <div className="friend-meta">
                      <span className={`friend-status ${friend.isOnline ? 'online' : 'offline'}`}>
                        {friend.isOnline ? t('friends.card.online') : t('friends.card.offline')}
                      </span>
                      {friend.isOnline && friend.distanceKm !== undefined && (
                        <span className="friend-distance">
                          {t('friends.card.distance', { distance: formatDistance(friend.distanceKm) })}
                        </span>
                      )}
                      {!friend.isOnline && friend.locationUpdatedAt && (
                        <span className="friend-last-seen">
                          {t('friends.card.lastSeen', { time: formatLastSeen(friend.locationUpdatedAt) })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="friend-reaction-btn"
                      onClick={() => handleOpenReactionPicker(friend)}
                      title={t('reactions.sendReaction')}
                    >
                      😊
                    </button>
                    <button
                      className="friend-message-btn"
                      onClick={() => handleOpenChat(friend)}
                      title={t('friends.card.message')}
                    >
                      <span className="message-icon">💬</span>
                    </button>
                    {friend.isOnline && friend.lastLatitude && friend.lastLongitude && onFlyToFriend && (
                      <button
                        className="friend-show-map-btn"
                        onClick={() => handleShowOnMap(friend)}
                        title={t('friends.card.showOnMap')}
                      >
                        <span className="map-icon">📍</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      {chatFriend && (
        <FriendChatPanel
          isOpen={isChatOpen}
          onClose={handleCloseChat}
          onBack={handleBackFromChat}
          friend={chatFriend}
          isMobile={isMobile}
        />
      )}

      {/* Reaction Picker Modal */}
      {reactionPickerFriend && (
        <div className="reaction-picker-overlay" onClick={handleCloseReactionPicker}>
          <div onClick={(e) => e.stopPropagation()}>
            <ReactionPicker
              onSelect={handleReactionSelect}
              onClose={handleCloseReactionPicker}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default FriendsPanel;
