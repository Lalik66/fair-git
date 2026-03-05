# MASTER PROMPT — Implement 2GIS-Style Messaging (Fair Marketplace)

**Version 2** — Adapted for Fair Marketplace with clarified contracts and implementation details.

---

## PART 1 — ROLE & CONTEXT

You are a Senior Full-Stack Engineer working on **Fair Marketplace**, a city fair mobile/web app that already supports:

- **Friends system**: `UserFollow` (followerId, followingId); invite flow creates mutual follows
- **Friend locations on map**: `GET /api/friends/locations`
- **Following list**: `GET /api/friends/following`
- **Auth**: JWT via `Authorization: Bearer <token>`, `authenticateToken` middleware
- **req.user**: Populated from DB after JWT validation. Use `req.user.id` throughout (not `req.user.userId`). Also has `email`, `role`, `firstName`, `lastName`.
- **REST API**: Express, Prisma (SQLite)
-**SQLite подходит для фазы 1/2. Для продакшена перейдите на PostgreSQL."*
- **Frontend**: React + Vite (not Next.js), axios, react-i18next
- **FriendsPanel**: `frontend/src/components/map/FriendsPanel.tsx` — friend list with avatars, online status, "Show on Map"
- **Design system**: `ui-expert.md` — Fair Marketplace colors, fonts (Poppins, Fredoka), child-first UI

There is currently **no messaging functionality**.

Your task is to implement a **2GIS-style 1:1 messaging system between friends**.

Keep implementation modular and production-ready. Do not rewrite existing systems unless required.

**Error handling**: Follow existing API format: `{ error: string }` with appropriate HTTP codes (400, 401, 403, 404).

---

## PART 2 — FEATURE SCOPE

Implement:

1. 1:1 private messaging between **mutual friends** (both follow each other)
2. Conversation history (paginated)
3. Real-time delivery (WebSockets)
4. Read status
5. Basic typing indicator
6. Notification badge count (unread messages)

Do **not** implement group chats.  
Do **not** implement media attachments (text only for v1).

---

## PART 3 — DATABASE DESIGN (Prisma)

Add models to `backend/prisma/schema.prisma`.

### Models

**Conversation**

- One conversation per friend pair
- Composite unique index on participant pair (normalized order)

**Message**

- `id`, `conversationId`, `senderId`, `content`, `createdAt`, `readAt` (nullable), `isDeleted` (optional)

### Constraints

- Messaging only between **mutual friends** (both `UserFollow` directions exist)
- One conversation per friend pair
- Composite unique index for the friend pair (e.g. `(userId1, userId2)` with consistent ordering)

### Relations

- `User` → `Conversation` (participant)
- `User` → `Message` (sender)
- `Conversation` → `Message`

After defining the schema, provide Prisma migration steps.

---

## PART 4 — REST API DESIGN

Base path: `/api/friends/messages` (under existing friends routes or separate messages router).

### 1. Send Message

`POST /api/friends/messages`

Body:

```json
{
  "recipientId": "string",
  "content": "string"
}
```

Rules:

- Validate **mutual friendship** (both `UserFollow` directions exist)
- Create conversation if it does not exist
- Save message
- Emit WebSocket event
- Use `authenticateToken`
- Always return `conversationId` in the response.
### 2. Get Conversation Messages

`GET /api/friends/messages/:friendId?cursor=xxx&limit=20`

- Cursor-based pagination
- Order: newest → oldest
- Auth validation
- Only allow access to own conversations
- Resolve conversation by `friendId` (the other participant)
- **Response must include `conversationId`** so the frontend can call `markAsRead`

### 3. Mark As Read

`PATCH /api/friends/messages/:conversationId/read`

- Update unread messages in that conversation for the current user
- Set `readAt` timestamp

### 4. Get Unread Count

`GET /api/friends/messages/meta/unread-count`

- Total unread messages for the current user
- Used for global badge
- **Register this route before `/:friendId`** (or use `/meta/unread-count`) to avoid Express matching `"unread-count"` as `friendId`

---

## PART 5 — WEBSOCKET ARCHITECTURE

Use **Socket.io v4.x** on both server and client.

### Requirements

1. **Auth**: Authenticate socket using JWT (e.g. `auth` event or query param `token`)
2. **Rooms**: Join user-specific room `user:{userId}`
3. **Events**:
   - `message:new` — payload: `{ conversationId, message }`
   - `typing:start` — payload: `{ conversationId, userId }`
   - `typing:stop` — payload: `{ conversationId, userId }`
4. **Typing indicator**: Emit `typing:start` on first keystroke; debounce `typing:stop` 2 seconds after last keystroke
5. **Security**: No cross-user message leaks; strict room isolation
6. **Integration**: Attach Socket.io to the existing Express server (same port as backend, e.g. `process.env.PORT` or 3002)
7. **CORS**: Configure Socket.io CORS to allow the frontend origin (e.g. `http://localhost:5173` for Vite dev, or the base URL from `VITE_API_URL`)

### Frontend connection

- Base URL: `import.meta.env.VITE_API_URL` or `http://localhost:3002`
- Pass JWT from `localStorage.getItem('token')` when connecting

---

## PART 6 — FRONTEND IMPLEMENTATION

### 1. Message service

File: `frontend/src/services/friendsMessagesService.ts`

Functions:

- `sendMessage(recipientId: string, content: string)`
- `getMessages(friendId: string, cursor?: string, limit?: number)` — response includes `conversationId`
- `markAsRead(conversationId: string)`
- `getUnreadCount()`
- `connectSocket()` — connect Socket.io with JWT, return socket instance
- Export `disconnectSocket()` and call it on `FriendChatPanel` unmount

Use the existing `api` axios instance from `frontend/src/services/api.ts` (JWT already attached).

### 2. Chat UI component

File: `frontend/src/components/map/FriendChatPanel.tsx`

Include:

- Scrollable message list
- Message bubbles (left = received, right = sent)
- Timestamp
- Read indicator
- Typing indicator (with 2s debounce on stop)
- Input field with send button
- Auto-scroll to bottom on new message

**Design**: Follow `ui-expert.md` — Fair Marketplace colors (`--color-coral`, `--color-sky-blue`, `--color-mint`, etc.), fonts (Poppins, Fredoka), rounded corners, child-friendly layout.

### 3. Integration points

- Add a **"Message"** button in `FriendsPanel.tsx` for each friend (next to "Show on Map")
- Optional: open chat from map marker popup
- Unread badge on friend avatar in `FriendsPanel` when there are unread messages from that friend

### 4. i18n

Add keys under `friends.messages` in `frontend/src/i18n/` for EN and AZ. Minimum required keys:

- `friends.messages.send`
- `friends.messages.typing`
- `friends.messages.read`
- `friends.messages.placeholder`
- `friends.messages.noMessages`
- `friends.messages.title` (chat panel header)
- `friends.messages.messageButton` (e.g. "Message" for the button in FriendsPanel)

---

## PART 7 — NOTIFICATIONS

Implement:

- Unread count per conversation
- Global unread badge (e.g. on Friends panel header or nav)
- Real-time badge updates via WebSocket (`message:new`, `read` updates)

Optional: placeholder for push notifications.

---

## PART 8 — PHASED IMPLEMENTATION STRATEGY

**Phase 1**

- Database models and migration
- REST endpoints
- Polling for new messages (e.g. every 30s when chat is open)

**Phase 2**

- WebSocket real-time delivery
- Typing indicator (with debounce)

**Phase 3**

- Performance tuning
- Indexing
- Query optimization

---

## PART 9 — SECURITY REQUIREMENTS

- Validate **mutual friendship** before sending messages
- Prevent IDOR: ensure user can only access their own conversations
- Rate limit message endpoint (stricter than general API)
- Sanitize content (basic XSS prevention)
- Reject empty messages
- Enforce max message length (e.g. 1000 chars)

---

## PART 10 — PERFORMANCE

- Indexes: `conversationId`, `senderId`, `recipientId` (or participant IDs), `createdAt`
- Cursor-based pagination (no offset)
- Lazy load messages (load more on scroll up)

---

## PART 11 — TESTING

**Frameworks**: Use Vitest for frontend, Jest + Supertest for backend API tests, socket.io-client for WebSocket tests. If the project already uses different tools, follow the existing setup.

Provide:

- Unit tests for service layer
- Integration test for message flow (send → fetch → mark read)
- WebSocket test for delivery
- Edge cases:
  - Non-mutual-friend messaging attempt
  - Invalid JWT
  - Empty message
  - Message too long

---

## OUTPUT FORMAT REQUIREMENT FOR AGENT

When implementing:

1. Prisma schema first
2. Backend controllers/routes
3. WebSocket setup
4. Frontend services
5. UI components
6. Security and testing notes

Keep code modular and separated by file.

---

## PROJECT-SPECIFIC NOTES

| Item | Fair Marketplace detail |
|------|--------------------------|
| **Friendship check** | Mutual: both `UserFollow` records must exist (A→B and B→A) |
| **Auth middleware** | `authenticateToken` from `backend/src/middleware/auth.ts` |
| **User ID** | Use `req.user.id` (from DB lookup, not JWT payload) |
| **API base** | `api` from `frontend/src/services/api.ts`; base URL from `VITE_API_URL` |
| **Friends list** | `getFollowing()` — users the current user follows |
| **FriendsPanel** | `frontend/src/components/map/FriendsPanel.tsx` — add Message button and unread badge |
| **Design** | `ui-expert.md` — warm-yellow, sky-blue, coral, mint, Poppins, Fredoka |
| **Backend port** | `process.env.PORT` or 3002 |
| **Frontend port** | Vite default 5173 (or 3000 if configured) |
| **Frontend** | React + Vite (no Next.js API routes) |

---

End of Master Prompt v2.
