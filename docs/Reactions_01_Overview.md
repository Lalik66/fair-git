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
