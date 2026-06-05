import { connectSocket, getSocket } from './friendsMessagesService';

export interface FriendLocationEvent {
  id: string;
  name: string;
  lastLatitude: number;
  lastLongitude: number;
  locationUpdatedAt: string;
}

/**
 * Subscribe to live friend location updates. Returns an unsubscribe fn.
 * Reuses the singleton socket connection that powers chat — no separate
 * connection, no extra auth handshake.
 */
export function onFriendLocation(
  callback: (event: FriendLocationEvent) => void,
): () => void {
  const sock = connectSocket();
  sock.on('friend:location', callback);
  return () => {
    sock.off('friend:location', callback);
  };
}

/**
 * Emit the current user's location to the server, which fans it out to
 * followers. Silent no-op if the socket isn't connected yet — the REST
 * polling fallback will keep things in sync until it is.
 */
export function emitLiveLocation(lat: number, lng: number): void {
  const sock = getSocket();
  if (!sock?.connected) return;
  sock.emit('location:update', { lat, lng });
}
