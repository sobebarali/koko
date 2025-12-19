---
title: Presence API
description: Real-time collaboration and user presence
---

# 👥 Presence API

## Overview

The Presence domain enables real-time collaboration features including live cursors, user presence indicators, typing notifications, and synchronized viewing. This powers the collaborative experience in Koko.

---

## 📌 Quick Reference

### Post-Launch Endpoints
| Endpoint | Type | Auth | Completed | Purpose |
|----------|------|------|-----------|---------|
| `presence.join` | Mutation | Yes | Not Started | Join a room/resource |
| `presence.leave` | Mutation | Yes | Not Started | Leave a room |
| `presence.heartbeat` | Mutation | Yes | Not Started | Update presence status |
| `presence.getActive` | Query | Yes | Not Started | Get active users in room |

### Growth Endpoints
| Endpoint | Type | Auth | Completed | Purpose | Priority |
|----------|------|------|-----------|---------|----------|
| `presence.updateCursor` | Mutation | Yes | Not Started | Broadcast cursor position | High |
| `presence.updateSelection` | Mutation | Yes | Not Started | Broadcast selection | High |
| `presence.setStatus` | Mutation | Yes | Not Started | Set user status | Medium |
| `presence.startTyping` | Mutation | Yes | Not Started | Indicate typing | Medium |
| `presence.stopTyping` | Mutation | Yes | Not Started | Stop typing indicator | Medium |

### Scale Endpoints
| Endpoint | Type | Auth | Completed | Purpose | Priority |
|----------|------|------|-----------|---------|----------|
| `presence.syncPlayback` | Mutation | Yes | Not Started | Sync video playback | High |
| `presence.requestControl` | Mutation | Yes | Not Started | Request playback control | Medium |
| `presence.grantControl` | Mutation | Yes | Not Started | Grant control to user | Medium |
| `presence.broadcast` | Mutation | Yes | Not Started | Custom broadcast message | Low |

---

## 📦 Data Models

### PresenceUser

```typescript
interface PresenceUser {
  userId: string;
  sessionId: string;               // Unique per tab/device
  
  // User info
  name: string;
  image?: string;
  color: string;                   // Assigned presence color
  
  // Status
  status: UserStatus;
  lastActiveAt: DateTime;
  
  // Location
  roomId: string;
  roomType: RoomType;
  
  // Cursor/Selection (for video player)
  cursor?: {
    timestamp: number;             // Video timestamp
    x?: number;                    // Normalized 0-1
    y?: number;                    // Normalized 0-1
  };
  selection?: {
    startTime: number;
    endTime: number;
  };
  
  // Activity
  isTyping: boolean;
  isWatching: boolean;
  playbackState?: PlaybackState;
}

type UserStatus = 'active' | 'idle' | 'away';

type RoomType = 'project' | 'video' | 'comment_thread' | 'comparison';

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
}
```

### PresenceRoom

```typescript
interface PresenceRoom {
  id: string;                      // Resource ID (video_123, project_456)
  type: RoomType;
  
  // Users
  users: PresenceUser[];
  userCount: number;
  
  // Playback sync (for video rooms)
  syncEnabled: boolean;
  controller?: string;             // User ID with playback control
  
  // Metadata
  createdAt: DateTime;
}
```

### PresenceEvent

```typescript
interface PresenceEvent {
  type: PresenceEventType;
  roomId: string;
  userId: string;
  sessionId: string;
  timestamp: DateTime;
  data: unknown;
}

type PresenceEventType =
  | 'user_joined'
  | 'user_left'
  | 'cursor_moved'
  | 'selection_changed'
  | 'typing_started'
  | 'typing_stopped'
  | 'status_changed'
  | 'playback_synced'
  | 'control_requested'
  | 'control_granted'
  | 'broadcast';
```

---

## 🔌 WebSocket Connection

### Connection Setup

```typescript
// Client connects to WebSocket endpoint
const ws = new WebSocket('wss://api.koko.com/presence');

// Authenticate on connect
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: sessionToken,
  }));
};

// Handle events
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handlePresenceEvent(message);
};
```

### Message Format

```typescript
// Client -> Server
interface ClientMessage {
  type: 'join' | 'leave' | 'cursor' | 'typing' | 'heartbeat' | 'playback';
  roomId?: string;
  data?: unknown;
}

// Server -> Client
interface ServerMessage {
  type: PresenceEventType;
  roomId: string;
  userId: string;
  data: unknown;
  timestamp: string;
}
```

---

## 🚀 Post-Launch Endpoints

### 1. presence.join

**Status:** 🔄 Post-Launch

**Purpose:** Join a presence room

**Type:** Mutation (also via WebSocket)

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  roomId: z.string(),
  roomType: z.enum(['project', 'video', 'comment_thread', 'comparison']),
}
```

**Response Schema:**

```typescript
{
  room: PresenceRoom;
  assignedColor: string;           // Unique color for this session
}
```

**WebSocket Message:**

```json
{
  "type": "join",
  "roomId": "video_123",
  "roomType": "video"
}
```

**Broadcast to Room:**

```json
{
  "type": "user_joined",
  "roomId": "video_123",
  "userId": "user_456",
  "data": {
    "name": "John Doe",
    "image": "https://...",
    "color": "#3B82F6"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Business Rules:**

1. User can be in multiple rooms simultaneously
2. Each tab/device gets unique session ID
3. Colors assigned to ensure visibility
4. Previous presence data loaded on join

---

### 2. presence.leave

**Status:** 🔄 Post-Launch

**Purpose:** Leave a presence room

**Type:** Mutation (also via WebSocket)

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  roomId: z.string(),
}
```

**WebSocket Message:**

```json
{
  "type": "leave",
  "roomId": "video_123"
}
```

**Broadcast to Room:**

```json
{
  "type": "user_left",
  "roomId": "video_123",
  "userId": "user_456",
  "timestamp": "2025-01-15T10:35:00Z"
}
```

---

### 3. presence.heartbeat

**Status:** 🔄 Post-Launch

**Purpose:** Update presence status and keep connection alive

**Type:** Mutation (WebSocket only)

**Auth Required:** Yes

**WebSocket Message:**

```json
{
  "type": "heartbeat",
  "status": "active"
}
```

**Business Rules:**

1. Send every 30 seconds
2. Status: 'active' (recent interaction), 'idle' (no interaction 2+ min)
3. Missing 3 heartbeats = user marked as disconnected
4. Server responds with `pong`

---

### 4. presence.getActive

**Status:** 🔄 Post-Launch

**Purpose:** Get currently active users in a room

**Type:** Query

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  roomId: z.string(),
  roomType: z.enum(['project', 'video', 'comment_thread', 'comparison']),
}
```

**Response Schema:**

```typescript
{
  users: Array<PresenceUser>;
  totalCount: number;
}
```

**Example Response:**

```json
{
  "users": [
    {
      "userId": "user_123",
      "name": "John Doe",
      "image": "https://...",
      "color": "#3B82F6",
      "status": "active",
      "lastActiveAt": "2025-01-15T10:30:00Z",
      "isTyping": false,
      "cursor": {
        "timestamp": 15.5,
        "x": 0.45,
        "y": 0.62
      }
    },
    {
      "userId": "user_456",
      "name": "Jane Smith",
      "color": "#10B981",
      "status": "idle",
      "isTyping": true
    }
  ],
  "totalCount": 2
}
```

---

## 🔮 Growth Endpoints

### presence.updateCursor

**Priority:** High  
**Purpose:** Broadcast cursor position on video  
**Complexity:** Simple

**WebSocket Message:**

```json
{
  "type": "cursor",
  "roomId": "video_123",
  "data": {
    "timestamp": 15.5,
    "x": 0.45,
    "y": 0.62
  }
}
```

**Broadcast to Room:**

```json
{
  "type": "cursor_moved",
  "roomId": "video_123",
  "userId": "user_456",
  "data": {
    "timestamp": 15.5,
    "x": 0.45,
    "y": 0.62,
    "color": "#3B82F6"
  }
}
```

**Throttling:**

- Max 20 updates per second per user
- Client should batch/throttle cursor movements
- Server discards excess updates

---

### presence.updateSelection

**Priority:** High  
**Purpose:** Broadcast timeline selection  
**Complexity:** Simple

**WebSocket Message:**

```json
{
  "type": "selection",
  "roomId": "video_123",
  "data": {
    "startTime": 10.0,
    "endTime": 25.5
  }
}
```

---

### presence.setStatus

**Priority:** Medium  
**Purpose:** Set custom user status  
**Complexity:** Simple

**Input:**

```typescript
{
  status: z.enum(['active', 'idle', 'away', 'busy', 'reviewing']),
  statusMessage: z.string().max(100).optional(),
}
```

---

### presence.startTyping / stopTyping

**Priority:** Medium  
**Purpose:** Indicate user is typing  
**Complexity:** Simple

**WebSocket Message:**

```json
{
  "type": "typing",
  "roomId": "video_123",
  "data": {
    "isTyping": true,
    "context": "comment"
  }
}
```

**Business Rules:**

1. Auto-stop after 5 seconds of no typing
2. Context indicates where typing (comment, reply, etc.)
3. Debounced on client side

---

## 🎯 Scale Endpoints

### presence.syncPlayback

**Priority:** High  
**Purpose:** Synchronize video playback across users  
**Complexity:** Medium

**WebSocket Message:**

```json
{
  "type": "playback",
  "roomId": "video_123",
  "data": {
    "action": "sync",
    "isPlaying": true,
    "currentTime": 45.5,
    "playbackRate": 1.0
  }
}
```

**Actions:**

| Action | Description |
|--------|-------------|
| `sync` | Sync all users to this state |
| `play` | Start playback |
| `pause` | Pause playback |
| `seek` | Seek to timestamp |
| `rate` | Change playback rate |

**Broadcast to Room:**

```json
{
  "type": "playback_synced",
  "roomId": "video_123",
  "userId": "user_456",
  "data": {
    "isPlaying": true,
    "currentTime": 45.5,
    "playbackRate": 1.0
  }
}
```

---

### presence.requestControl

**Priority:** Medium  
**Purpose:** Request playback control  
**Complexity:** Simple

**WebSocket Message:**

```json
{
  "type": "control_request",
  "roomId": "video_123"
}
```

**Broadcast:**

```json
{
  "type": "control_requested",
  "roomId": "video_123",
  "userId": "user_456",
  "data": {
    "requesterName": "John Doe"
  }
}
```

---

### presence.grantControl

**Priority:** Medium  
**Purpose:** Grant playback control to another user  
**Complexity:** Simple

**WebSocket Message:**

```json
{
  "type": "control_grant",
  "roomId": "video_123",
  "data": {
    "toUserId": "user_789"
  }
}
```

---

### presence.broadcast

**Priority:** Low  
**Purpose:** Send custom broadcast message  
**Complexity:** Simple

**WebSocket Message:**

```json
{
  "type": "broadcast",
  "roomId": "video_123",
  "data": {
    "type": "reaction",
    "emoji": "👍",
    "timestamp": 15.5
  }
}
```

---

## 🎨 UI Components

### User Avatars

```
┌─────────────────────────────────────────────┐
│ Viewing: Product Demo                        │
│                                              │
│ 👤 👤 👤 +2 more                             │
│ JD JS MK                                     │
│ ●  ○  ●                                      │
│ (active, idle, active)                       │
└─────────────────────────────────────────────┘
```

### Live Cursors on Video

```
┌─────────────────────────────────────────────┐
│                                              │
│        ┌─────┐                               │
│        │ JD  │ ← John's cursor              │
│        └──┬──┘                               │
│           │                                  │
│                    ┌─────┐                   │
│                    │ JS  │ ← Jane's cursor  │
│                    └──┬──┘                   │
│                       │                      │
│ ▶ ━━━━━━━○━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2:30  │
│    ↑ JD   ↑ JS                               │
└─────────────────────────────────────────────┘
```

### Typing Indicators

```
┌─────────────────────────────────────────────┐
│ Comments                                     │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ John: Great work on this scene!         │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Jane is typing...                       │ │
│ │ ●●●                                     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Playback Sync Control

```
┌─────────────────────────────────────────────┐
│ 🎬 Watch Together                            │
│                                              │
│ Controller: John Doe                         │
│ [Request Control]                            │
│                                              │
│ Viewers synced: 4/5                          │
│ ● John (controlling)                         │
│ ● Jane (synced)                              │
│ ● Mike (synced)                              │
│ ○ Sarah (desynced - paused)                  │
│ ● Tom (synced)                               │
└─────────────────────────────────────────────┘
```

---

## ⚡ Performance

### Connection Limits

| Metric | Limit |
|--------|-------|
| Max users per room | 100 |
| Max rooms per user | 10 |
| Max sessions per user | 5 |
| Heartbeat interval | 30s |
| Cursor update rate | 20/s |

### Message Throttling

| Message Type | Max Rate |
|--------------|----------|
| Cursor updates | 20/second |
| Typing indicator | 2/second |
| Playback sync | 5/second |
| Heartbeat | 1/30 seconds |

### Latency Targets

| Operation | Target |
|-----------|--------|
| Join room | < 100ms |
| Cursor broadcast | < 50ms |
| Typing broadcast | < 50ms |
| Playback sync | < 100ms |

---

## 🔒 Security

### Authorization

- Users can only join rooms for resources they can access
- Cursor/selection data only shared with room members
- Control requests require room membership

### Rate Limiting

- Per-user message rate limits
- Per-room broadcast limits
- Auto-disconnect on abuse

### Privacy

- Presence can be disabled per-user
- "Invisible" mode available
- Cursor sharing optional

---

## 🧪 Testing Scenarios

### Connection Testing
- [ ] WebSocket connection establishment
- [ ] Authentication on connect
- [ ] Reconnection on disconnect
- [ ] Multi-tab support

### Room Testing
- [ ] Join room
- [ ] Leave room
- [ ] Receive user_joined events
- [ ] Receive user_left events
- [ ] Handle room limits

### Cursor Testing
- [ ] Cursor position broadcast
- [ ] Cursor throttling
- [ ] Cursor rendering on other clients
- [ ] Cursor cleanup on leave

### Playback Sync Testing
- [ ] Sync play/pause
- [ ] Sync seek
- [ ] Control transfer
- [ ] Desync handling

---

## 📚 Related Documentation

- [Videos API](./04-videos) - Video player integration
- [Comments API](./05-comments) - Typing indicators
- [Comparisons API](./22-comparisons) - Synced comparison viewing

---

## 🔗 External Resources

- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Y.js](https://yjs.dev/) - CRDT for real-time collaboration
- [Liveblocks](https://liveblocks.io/) - Presence implementation reference
- [PartyKit](https://www.partykit.io/) - Real-time infrastructure
