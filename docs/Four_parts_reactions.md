
Here are the four prompts in order. Each is self-contained so you can send them to the Agent one after another.

---

# Part 1: Reactions_01_Overview

```
Create a new markdown file at `docs/Reactions_01_Overview.md` with the following content. This is the overview document for the 2GIS-style Reactions feature.

---

# Reactions Feature — Part 1: Overview

## Context

Implement a **2GIS-style reactions** feature for Fair Marketplace. Users can send quick emoji reactions to friends (e.g. ❤️ 🔥 👀 🎉) from the map (friend marker popup) or from the FriendsPanel. When a friend sends reactions, the recipient sees a counter badge next to that friend's avatar in the friend list. Reference: https://help.2gis.ru/ (Friends: interaction).

## Existing Codebase Summary

- **Backend:** Prisma (SQLite), Express, Socket.io. Friends: `UserFollow`, `GET /api/friends/locations`, `GET /api/friends/following`. WebSocket: users join `user:${userId}` rooms.
- **Frontend:** MapPanel (friend popups via `createFriendPopupContent`), FriendsPanel (friend list with avatars, unread badge, message/show-on-map buttons), friendsService, friendsMessagesService.
- **i18n:** react-i18next, en + az in `frontend/src/i18n/config.ts`.

## Implementation Parts (in order)

1. **Part 2 — Schema & API:** Prisma Reaction model, REST endpoints, WebSocket emit
2. **Part 3 — Service & Picker:** reactionsService.ts, ReactionPicker component
3. **Part 4 — Integration:** Map popup, FriendsPanel counter/button, i18n

## Acceptance Criteria

- [ ] User can send a reaction from the map friend popup
- [ ] User can send a reaction from FriendsPanel
- [ ] Recipient receives reactions in real time via WebSocket
- [ ] Friend list shows reaction counter next to avatars (distinct from message unread badge)
- [ ] Emoji picker with allowed set: ❤️ 🔥 👀 🎉 😠 👋 💩 ❄️ ✈️
- [ ] All strings use i18n (en/az)
- [ ] Only mutual friends can send reactions

## Files to Create/Modify (full feature)

| File | Action |
|------|--------|
| backend/prisma/schema.prisma | Add Reaction model |
| backend/src/routes/reactions.ts | New |
| backend/src/index.ts | Mount reactions routes |
| backend/src/websocket/index.ts | Emit reaction:new |
| frontend/src/services/reactionsService.ts | New |
| frontend/src/components/ReactionPicker.tsx | New |
| frontend/src/components/map/MapPanel.tsx | Add reaction button |
| frontend/src/components/map/FriendsPanel.tsx | Counter + button |
| frontend/src/i18n/config.ts | Add reactions translations |

## Security

- Validate mutual friendship before creating a reaction
- Validate emoji against allowlist
- Rate limit: consider max reactions per minute per recipient
```

---

# Part 2: Reactions_02_Schema_And_API

```
Implement the backend for the 2GIS-style Reactions feature. Follow the overview in `docs/Reactions_01_Overview.md` if it exists.

## 1. Prisma Schema

Add to `backend/prisma/schema.prisma`:

```prisma
model Reaction {
  id          String   @id @default(uuid())
  senderId    String   @map("sender_id")
  recipientId String   @map("recipient_id")
  emoji       String
  createdAt   DateTime @default(now()) @map("created_at")

  sender    User @relation("ReactionSender", fields: [senderId], references: [id], onDelete: Cascade)
  recipient User @relation("ReactionRecipient", fields: [recipientId], references: [id], onDelete: Cascade)

  @@index([recipientId, createdAt(sort: Desc)])
  @@index([senderId])
  @@map("reactions")
}
```

Add to the User model:
```prisma
reactionsSent     Reaction[] @relation("ReactionSender")
reactionsReceived Reaction[] @relation("ReactionRecipient")
```

Run `npx prisma db push` (or create a migration) to apply the schema.

## 2. API Routes

Create `backend/src/routes/reactions.ts`:

**POST /api/friends/reactions**
- Body: `{ recipientId: string, emoji: string }`
- Auth: authenticateToken
- Validate: mutual friendship (reuse logic from messages), emoji in allowlist
- Allowed emojis: ["❤️", "🔥", "👀", "🎉", "😠", "👋", "💩", "❄️", "✈️"]
- Create Reaction record
- Emit WebSocket event `reaction:new` to `user:${recipientId}` with payload: `{ reaction: { id, emoji, senderId, senderName, createdAt } }`
- Response: `{ reaction: { id, emoji, senderId, recipientId, createdAt } }`

**GET /api/friends/reactions/unread-count**
- Auth: authenticateToken
- Return count of reactions received from each friend (grouped by senderId), excluding self
- Response: `{ byFriend: [{ friendId, friendName, count }] }`

Use the same mutual-friendship validation as in `backend/src/routes/messages.ts` (validateMutualFriendship or equivalent).

## 3. Mount Routes

In `backend/src/index.ts`, mount the reactions router under `/api/friends` (or appropriate path). Ensure it does not conflict with existing `/api/friends/locations` or `/api/friends/following` routes (place more specific routes first).

## 4. WebSocket Emit

The messages routes use `setSocketIO(io)` to get the io instance. In the POST reactions handler, after creating the reaction, call `io.to(\`user:${recipientId}\`).emit('reaction:new', { reaction: {...} })`. You may need to pass the io instance to the reactions router (e.g. via setSocketIO pattern used in messages).

## 5. Verify

- Backend starts without errors
- `prisma db push` succeeds
- POST /api/friends/reactions and GET /api/friends/reactions/unread-count are reachable (manual test or curl)
```

---

# Part 3: Reactions_03_Service_And_Picker

```
Implement the frontend service and ReactionPicker component for the 2GIS-style Reactions feature. The backend (Part 2) should already be done: POST /api/friends/reactions, GET /api/friends/reactions/unread-count, WebSocket event `reaction:new`.

## 1. Reactions Service

Create `frontend/src/services/reactionsService.ts`:

- **sendReaction(recipientId: string, emoji: string): Promise<{ reaction: {...} }>**
  - POST to `/api/friends/reactions` with `{ recipientId, emoji }`
  - Use the same `api` instance (axios with auth) as in friendsService

- **getReactionCounts(): Promise<{ byFriend: { friendId: string; friendName: string; count: number }[] }>**
  - GET `/api/friends/reactions/unread-count`
  - Return the response data

- **onReactionNew(callback: (event: { reaction: {...} }) => void): () => void**
  - Subscribe to WebSocket `reaction:new` event
  - Reuse the existing Socket.io connection from friendsMessagesService (connectSocket, getSocket). If the socket is shared, add a listener for `reaction:new` and return an unsubscribe function that removes the listener.

Export all functions and necessary types.

## 2. ReactionPicker Component

Create `frontend/src/components/ReactionPicker.tsx`:

- **Props:** `onSelect: (emoji: string) => void`, `onClose?: () => void`, `className?: string`
- **Emojis:** ❤️ 🔥 👀 🎉 😠 👋 💩 ❄️ ✈️ (same allowlist as backend)
- Render a horizontal or grid layout of emoji buttons. Each button shows one emoji. On click, call `onSelect(emoji)` and `onClose?.()`.
- Use `role="list"` and `role="listitem"` or appropriate ARIA. Add `aria-label` for accessibility.
- Style to fit the existing design (e.g. FriendsPanel, map popup). Use CSS classes like `reaction-picker`, `reaction-picker-emoji`.
- Create `frontend/src/components/ReactionPicker.css` for styles.

## 3. Verify

- reactionsService exports work
- ReactionPicker renders and onSelect is called when an emoji is clicked
- No TypeScript or lint errors
```

---

# Part 4: Reactions_04_Integration

```
Integrate the Reactions feature into MapPanel and FriendsPanel. Parts 2 (backend) and 3 (service + ReactionPicker) should already be implemented.

## 1. MapPanel — Friend Popup

In `frontend/src/components/map/MapPanel.tsx`:

- Add `onSendReaction?: (friendId: string) => void` to MapPanelProps.
- In `createFriendPopupContent`, add a "Send reaction" button after the "Get Directions" button:
  - `data-action="send-reaction"`, `data-friend-id="${escapeHTML(friend.id)}"`
  - Use a reaction/emoji icon (e.g. 😊 or a custom icon) and accessible title.
- In the existing event delegation (where Get Directions is handled), add a handler for `[data-action="send-reaction"]`: read `data-friend-id` and call `onSendReaction?.(friendId)`.

## 2. SplitViewMapLayout — Reaction Picker State

In `frontend/src/components/map/SplitViewMapLayout.tsx`:

- Add state: `reactionPickerFriend: { id: string; name: string } | null`
- Pass `onSendReaction={(friendId) => { /* open picker for this friend */ }}` to MapPanel. When called, set `reactionPickerFriend` to the friend (you may need to pass friend name from MapPanel or look it up from friendLocations).
- Render `ReactionPicker` when `reactionPickerFriend` is set (e.g. as a modal or popover). On `onSelect(emoji)`, call `sendReaction(reactionPickerFriend.id, emoji)` from reactionsService, then set `reactionPickerFriend` to null. On `onClose`, set `reactionPickerFriend` to null.
- Ensure the picker is positioned so it's visible (e.g. centered overlay or near the map).

## 3. FriendsPanel — Counter and Button

In `frontend/src/components/map/FriendsPanel.tsx`:

- Extend `FriendWithStatus` (or the friend type) with `reactionCount?: number`.
- On panel open (in the same useEffect that fetches friends), call `getReactionCounts()` from reactionsService. Build a Map<friendId, count> and merge into friend data (similar to unreadByFriend).
- In the friend list item, next to the avatar (near the unread badge), show a reaction badge when `reactionCount > 0`: use a different class (e.g. `friend-reaction-badge`) and style it distinctly from `friend-unread-badge` (e.g. different color).
- Add a reaction button in `friend-actions` (next to message and show-on-map): emoji or reaction icon. On click, open ReactionPicker (inline or in a small popover). On emoji select, call `sendReaction(friend.id, emoji)` and close the picker.
- Subscribe to `onReactionNew` when the panel is open; when a reaction is received, refresh reaction counts (or update local state if the event includes friendId).

## 4. i18n

Add to `frontend/src/i18n/config.ts` in both `en` and `az`:

```ts
reactions: {
  sendReaction: 'Send reaction',
  pickEmoji: 'Pick an emoji',
  sent: 'Reaction sent!',
  reactionsFrom: '{{name}} sent you {{count}} reactions',
},
```

Use `t('reactions.sendReaction')` etc. in ReactionPicker, MapPanel, and FriendsPanel where applicable.

## 5. CSS

Add styles for:
- `friend-reaction-badge` (distinct from unread badge)
- ReactionPicker layout and emoji buttons
- Any modal/popover for the picker in SplitViewMapLayout

## 6. Verify

- Sending a reaction from the map popup works
- Sending a reaction from FriendsPanel works
- Reaction counter appears next to friend avatars when they send reactions
- WebSocket delivers reactions in real time
- No TypeScript or lint errors
- All user-facing strings use i18n
```

---

## How to use

1. Send **Part 1** to the Agent → creates `docs/Reactions_01_Overview.md`.
2. Send **Part 2** to the Agent → implements schema, API, and WebSocket.
3. Send **Part 3** to the Agent → implements `reactionsService` and `ReactionPicker`.
4. Send **Part 4** to the Agent → wires MapPanel, FriendsPanel, SplitViewMapLayout, and i18n.

Each part assumes the previous parts are done. If you want, I can turn these into markdown files in your `docs/` folder.