
Here’s a prompt you can use:

---

# Prompt: 2GIS-Style Reactions for Fair Marketplace

## Context

Fair Marketplace has friend markers on the map and a FriendsPanel. Implement a **2GIS-style reactions** feature so users can send quick emoji reactions to friends. Reference: [2GIS Friends interaction](https://help.2gis.ru/) — reactions can be sent from a friend’s profile or by clicking their avatar on the map. After sending, the friend gets a notification and a counter appears next to their avatar in the friend list.

## Existing Codebase

### Backend
- **Prisma schema** (`backend/prisma/schema.prisma`): `User`, `UserFollow` (friends), `Conversation`, `Message`
- **Friends routes** (`backend/src/routes/friends.ts`): `GET /api/friends/locations`, `GET /api/friends/following`, `POST /api/friends/follow/:userId`, `DELETE /api/friends/unfollow/:userId`
- **WebSocket** (`backend/src/websocket/index.ts`): Socket.io with JWT auth, users join `user:${userId}` rooms; events: `message:new`, `typing:start`, `typing:stop`, `messages:read`
- **Messages** (`backend/src/routes/messages.ts`): Friend messaging via REST + WebSocket

### Frontend
- **MapPanel** (`frontend/src/components/map/MapPanel.tsx`): Friend markers with popups via `createFriendPopupContent`. Popup shows name, distance, “Get Directions” button. Event delegation for `[data-action="get-directions"]` with `data-friend-id`
- **FriendsPanel** (`frontend/src/components/map/FriendsPanel.tsx`): Friend list with avatars, status, unread badge (`friend-unread-badge`), actions (message, show on map)
- **friendsService** (`frontend/src/services/friendsService.ts`): `getFollowing()`, `getFriendLocations()`
- **friendsMessagesService** (`frontend/src/services/friendsMessagesService.ts`): `sendMessage`, `getUnreadCount`, WebSocket `onNewMessage`, `connectSocket`, etc.
- **i18n**: `react-i18next` with `en` and `az` in `frontend/src/i18n/config.ts`

### Data Flow
- Friends: mutual `UserFollow` (follower + following)
- Friend locations: `GET /api/friends/locations` → `FriendLocation[]`
- Unread messages: `getUnreadCount()` → `byConversation` with `friendId`, `unreadCount`

---

## Required Changes

### 1. Backend — Schema

Add a `Reaction` model in `schema.prisma`:

```prisma
model Reaction {
  id         String   @id @default(uuid())
  senderId   String   @map("sender_id")
  recipientId String @map("recipient_id")
  emoji      String   // e.g. "❤️", "🔥", "👀", "🎉", "😠", "👋", "💩", "❄️", "✈️"
  createdAt  DateTime @default(now()) @map("created_at")

  sender     User     @relation("ReactionSender", fields: [senderId], references: [id], onDelete: Cascade)
  recipient  User     @relation("ReactionRecipient", fields: [recipientId], references: [id], onDelete: Cascade)

  @@index([recipientId, createdAt(sort: Desc)])
  @@index([senderId])
  @@map("reactions")
}
```

Add relations on `User`:

```prisma
reactionsSent     Reaction[] @relation("ReactionSender")
reactionsReceived Reaction[] @relation("ReactionRecipient")
```

Run `prisma db push` or create a migration.

---

### 2. Backend — API Routes

Create `backend/src/routes/reactions.ts` (or extend `friends.ts`):

**POST `/api/friends/reactions`**
- Body: `{ recipientId: string, emoji: string }`
- Auth: `authenticateToken`
- Validate: mutual friendship, `emoji` in allowed list
- Create `Reaction` record
- Emit WebSocket `reaction:new` to `user:${recipientId}`
- Response: `{ reaction: { id, emoji, senderId, recipientId, createdAt } }`

**GET `/api/friends/reactions/unread-count`**
- Auth: `authenticateToken`
- Return count of reactions received from each friend (grouped by sender)
- Response: `{ byFriend: [{ friendId, friendName, count }] }`

**PATCH `/api/friends/reactions/mark-seen`** (optional)
- Body: `{ friendId?: string }` — mark reactions from that friend (or all) as seen
- If you add `seenAt` to `Reaction`, update it here

Allowed emojis: `❤️ 🔥 👀 🎉 😠 👋 💩 ❄️ ✈️` (or a config array).

---

### 3. Backend — WebSocket

In `backend/src/websocket/index.ts`:

- On `reaction:new` (or equivalent), emit to `user:${recipientId}`:

```ts
io.to(`user:${recipientId}`).emit('reaction:new', {
  reaction: { id, emoji, senderId, senderName, createdAt },
});
```

---

### 4. Frontend — Reactions Service

Create `frontend/src/services/reactionsService.ts`:

- `sendReaction(recipientId: string, emoji: string): Promise<SendReactionResponse>`
- `getReactionCounts(): Promise<{ byFriend: { friendId, friendName, count }[] }>`
- `onReactionNew(callback): () => void` — subscribe to WebSocket `reaction:new`
- Reuse existing WebSocket connection (e.g. from `friendsMessagesService` or shared socket)

---

### 5. Frontend — Map Popup (MapPanel)

In `createFriendPopupContent`:

- Add a “Send reaction” / emoji button next to “Get Directions”
- Use `data-action="send-reaction"` and `data-friend-id="${friend.id}"`
- On click, open an emoji picker (inline or small popover)

**Emoji picker options:**
- Inline row of emoji buttons in the popup
- Or a small popover that opens on button click

**Event delegation** (same pattern as Get Directions):

- Listen for `[data-action="send-reaction"]` on the map container
- Read `data-friend-id` and show emoji picker (or send directly if single emoji)
- If picker is in a React component, use a callback passed to MapPanel: `onSendReaction?: (friendId: string) => void` — parent opens a modal/popover for emoji selection

**Alternative:** Use a custom Mapbox popup with a React root for the emoji picker (more complex).

---

### 6. Frontend — FriendsPanel

**Reaction counter:**
- Extend `FriendWithStatus` with `reactionCount?: number` (reactions received from that friend)
- Fetch via `getReactionCounts()` (or equivalent) when panel opens
- Show a badge next to the avatar (similar to `friend-unread-badge`) when `reactionCount > 0`
- Use a distinct style (e.g. different color) from the message unread badge

**Reaction entry point:**
- Add a reaction button (e.g. emoji icon) in `friend-actions` next to message and show-on-map
- On click, open emoji picker and call `sendReaction(friend.id, selectedEmoji)`

---

### 7. Emoji Picker Component

Create `frontend/src/components/ReactionPicker.tsx`:

- Props: `onSelect: (emoji: string) => void`, `onClose?: () => void`
- Render a grid of allowed emojis: `❤️ 🔥 👀 🎉 😠 👋 💩 ❄️ ✈️`
- On emoji click: call `onSelect(emoji)` and close
- Accessible (keyboard, focus, aria-labels)
- Responsive (works in map popup and FriendsPanel)

---

### 8. i18n

Add to `en` and `az` in `config.ts`:

```ts
reactions: {
  sendReaction: 'Send reaction',
  reactionsFrom: '{{name}} sent you {{count}} reactions',
  pickEmoji: 'Pick an emoji',
  sent: 'Reaction sent!',
  // etc.
},
```

---

## Implementation Order

1. Schema + migration
2. Backend API + WebSocket
3. `reactionsService.ts`
4. `ReactionPicker` component
5. Map popup: add button + event delegation + integrate picker
6. FriendsPanel: counter + reaction button
7. i18n
8. (Optional) Mark-as-seen and push notifications

---

## Acceptance Criteria

- [ ] User can send a reaction to a friend from the map popup (friend marker click)
- [ ] User can send a reaction to a friend from FriendsPanel
- [ ] Recipient receives reactions in real time via WebSocket
- [ ] Friend list shows a reaction counter next to avatars for friends who sent reactions
- [ ] Counter is visually distinct from message unread badge
- [ ] Emoji picker shows the defined set of emojis
- [ ] All user-facing strings use i18n (en/az)
- [ ] Only mutual friends can send reactions
- [ ] Invalid emoji values are rejected by the API

---

## Optional Enhancements

- **Push notifications:** Integrate Firebase/OneSignal for mobile push when a reaction is received
- **Reaction history:** Page or modal to view recent reactions
- **Mark as seen:** Mark reactions as seen and hide/update the counter
- **Sound/haptic:** Optional feedback when sending or receiving a reaction

---

## Security

- Validate mutual friendship before creating a reaction
- Validate `emoji` against an allowlist
- Rate limit reaction sending (e.g. max N per minute per recipient)
- Ensure WebSocket auth matches REST auth (same JWT)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/prisma/schema.prisma` | Add Reaction model, User relations |
| `backend/src/routes/reactions.ts` | New file |
| `backend/src/index.ts` | Mount reactions routes |
| `backend/src/websocket/index.ts` | Emit reaction:new |
| `frontend/src/services/reactionsService.ts` | New file |
| `frontend/src/components/ReactionPicker.tsx` | New file |
| `frontend/src/components/map/MapPanel.tsx` | Add reaction button, event delegation |
| `frontend/src/components/map/SplitViewMapLayout.tsx` | Pass onSendReaction if needed |
| `frontend/src/components/map/FriendsPanel.tsx` | Counter, reaction button |
| `frontend/src/i18n/config.ts` | Add reactions translations |

---

You can save this as `docs/Reactions_2GIS_style_prompt.md` or similar and use it as the implementation spec.