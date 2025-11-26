---
title: Playlists API
description: Organize and share video collections
---

# 🎬 Playlists API

## Overview

The Playlists domain enables users to create curated collections of videos for presentation, review, or organization purposes. Playlists can span multiple projects and be shared with specific audiences.

---

## 📌 Quick Reference

### Post-Launch Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `playlist.create` | Mutation | Yes | Create new playlist |
| `playlist.getAll` | Query | Yes | List user's playlists |
| `playlist.getById` | Query | Yes | Get playlist with videos |
| `playlist.update` | Mutation | Yes | Update playlist metadata |
| `playlist.delete` | Mutation | Yes | Delete playlist |
| `playlist.addVideos` | Mutation | Yes | Add videos to playlist |
| `playlist.removeVideos` | Mutation | Yes | Remove videos from playlist |

### Growth Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `playlist.reorder` | Mutation | Yes | Reorder videos | High |
| `playlist.duplicate` | Mutation | Yes | Clone playlist | Medium |
| `playlist.share` | Mutation | Yes | Share with users/link | Medium |
| `playlist.getShared` | Query | Yes | Get shared playlists | Medium |
| `playlist.merge` | Mutation | Yes | Combine playlists | Low |

### Scale Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `playlist.createSmart` | Mutation | Yes | Auto-updating playlist | Medium |
| `playlist.setPresentation` | Mutation | Yes | Presentation mode settings | Low |
| `playlist.getAnalytics` | Query | Yes | View engagement stats | Low |

---

## 📦 Data Models

### Playlist

```typescript
interface Playlist {
  id: string;                      // Unique identifier
  ownerId: string;                 // Creator
  teamId?: string;                 // Team ownership (optional)
  
  // Metadata
  title: string;
  description?: string;
  coverImage?: string;             // Custom cover or first video thumbnail
  
  // Settings
  visibility: PlaylistVisibility;  // 'private' | 'team' | 'public'
  isSmartPlaylist: boolean;        // Auto-updating based on rules
  smartRules?: SmartPlaylistRules;
  
  // Presentation
  presentationMode?: PresentationSettings;
  
  // Stats
  videoCount: number;
  totalDuration: number;           // Seconds
  viewCount: number;
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}

type PlaylistVisibility = 'private' | 'team' | 'public';

interface SmartPlaylistRules {
  projectIds?: string[];           // From specific projects
  tags?: string[];                 // With specific tags
  uploadedAfter?: DateTime;        // Date filter
  uploadedBy?: string[];           // By specific users
  minDuration?: number;            // Minimum duration (seconds)
  maxDuration?: number;            // Maximum duration
  sortBy: 'created' | 'updated' | 'title' | 'duration';
  sortOrder: 'asc' | 'desc';
  limit?: number;                  // Max videos
}

interface PresentationSettings {
  autoPlay: boolean;
  loop: boolean;
  showTitles: boolean;
  transitionType: 'none' | 'fade' | 'slide';
  transitionDuration: number;      // Milliseconds
}
```

### PlaylistVideo

```typescript
interface PlaylistVideo {
  id: string;
  playlistId: string;
  videoId: string;
  
  // Ordering
  position: number;
  
  // Custom metadata (overrides video defaults)
  customTitle?: string;
  customDescription?: string;
  startTime?: number;              // Start at specific timestamp
  endTime?: number;                // End at specific timestamp
  
  // Timestamps
  addedAt: DateTime;
  addedBy: string;
}
```

### Drizzle Schema

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const playlist = sqliteTable(
  "playlist",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .references(() => team.id, { onDelete: "set null" }),
    
    title: text("title").notNull(),
    description: text("description"),
    coverImage: text("cover_image"),
    
    visibility: text("visibility", { 
      enum: ["private", "team", "public"] 
    }).default("private").notNull(),
    isSmartPlaylist: integer("is_smart_playlist", { mode: "boolean" })
      .default(false)
      .notNull(),
    smartRules: text("smart_rules", { mode: "json" })
      .$type<SmartPlaylistRules>(),
    
    presentationMode: text("presentation_mode", { mode: "json" })
      .$type<PresentationSettings>(),
    
    videoCount: integer("video_count").default(0).notNull(),
    totalDuration: integer("total_duration").default(0).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("playlist_owner_idx").on(table.ownerId),
    index("playlist_team_idx").on(table.teamId),
    index("playlist_visibility_idx").on(table.visibility),
  ]
);

export const playlistVideo = sqliteTable(
  "playlist_video",
  {
    id: text("id").primaryKey(),
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlist.id, { onDelete: "cascade" }),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    
    position: integer("position").notNull(),
    
    customTitle: text("custom_title"),
    customDescription: text("custom_description"),
    startTime: integer("start_time"),
    endTime: integer("end_time"),
    
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    addedBy: text("added_by")
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index("playlist_video_playlist_idx").on(table.playlistId),
    index("playlist_video_video_idx").on(table.videoId),
    index("playlist_video_position_idx").on(table.playlistId, table.position),
  ]
);
```

---

## 🚀 Post-Launch Endpoints

### 1. playlist.create

**Status:** 🔄 Post-Launch

**Purpose:** Create a new playlist

**Type:** Mutation

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  title: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['private', 'team', 'public']).default('private'),
  teamId: z.string().optional(),
  videoIds: z.array(z.string()).max(500).optional(),
}
```

**Response Schema:**

```typescript
{
  playlist: Playlist;
}
```

**Example Request:**

```typescript
const { playlist } = await trpc.playlist.create.mutate({
  title: "Q1 2025 Campaign Videos",
  description: "All videos for the Q1 marketing campaign",
  visibility: "team",
  teamId: "team_123",
  videoIds: ["video_1", "video_2", "video_3"],
});
```

**Example Response:**

```json
{
  "playlist": {
    "id": "pl_507f1f77bcf86cd799439011",
    "title": "Q1 2025 Campaign Videos",
    "description": "All videos for the Q1 marketing campaign",
    "visibility": "team",
    "videoCount": 3,
    "totalDuration": 1845,
    "viewCount": 0,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `BAD_REQUEST` - Invalid input
- `NOT_FOUND` - Video(s) not found

**Business Rules:**

1. Maximum 500 videos per playlist
2. User must have view access to all videos added
3. Team playlists require team membership
4. Cover image auto-set to first video thumbnail

---

### 2. playlist.getAll

**Status:** 🔄 Post-Launch

**Purpose:** List user's playlists

**Type:** Query

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  visibility: z.enum(['private', 'team', 'public', 'all']).default('all'),
  teamId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  playlists: Array<Playlist & {
    previewVideos: Array<{
      id: string;
      thumbnailUrl: string;
    }>;
  }>;
  nextCursor?: string;
}
```

---

### 3. playlist.getById

**Status:** 🔄 Post-Launch

**Purpose:** Get playlist with all videos

**Type:** Query

**Auth Required:** Yes (unless public)

**Input Schema:**

```typescript
{
  id: z.string(),
  includeVideos: z.boolean().default(true),
}
```

**Response Schema:**

```typescript
{
  playlist: Playlist & {
    owner: { id: string; name: string; image?: string };
  };
  videos?: Array<{
    id: string;
    position: number;
    video: Video;
    customTitle?: string;
    startTime?: number;
    endTime?: number;
  }>;
}
```

---

### 4. playlist.update

**Status:** 🔄 Post-Launch

**Purpose:** Update playlist metadata

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be owner

**Input Schema:**

```typescript
{
  id: z.string(),
  title: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(['private', 'team', 'public']).optional(),
  coverImage: z.string().url().nullable().optional(),
}
```

---

### 5. playlist.delete

**Status:** 🔄 Post-Launch

**Purpose:** Delete a playlist

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be owner

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Business Rules:**

1. Only owner can delete
2. Videos are not deleted (just removed from playlist)
3. Shared links become invalid

---

### 6. playlist.addVideos

**Status:** 🔄 Post-Launch

**Purpose:** Add videos to playlist

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be owner or editor

**Input Schema:**

```typescript
{
  playlistId: z.string(),
  videoIds: z.array(z.string()).min(1).max(100),
  position: z.enum(['start', 'end']).default('end'),
}
```

**Response Schema:**

```typescript
{
  playlist: Playlist;
  addedCount: number;
  skippedCount: number;          // Already in playlist
}
```

---

### 7. playlist.removeVideos

**Status:** 🔄 Post-Launch

**Purpose:** Remove videos from playlist

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be owner or editor

**Input Schema:**

```typescript
{
  playlistId: z.string(),
  videoIds: z.array(z.string()).min(1).max(100),
}
```

**Response Schema:**

```typescript
{
  playlist: Playlist;
  removedCount: number;
}
```

---

## 🔮 Growth Endpoints

### playlist.reorder

**Priority:** High  
**Purpose:** Reorder videos in playlist  
**Complexity:** Simple

**Input:**

```typescript
{
  playlistId: z.string(),
  videoIds: z.array(z.string()),   // Full ordered list
}
```

**Alternative Input (move single video):**

```typescript
{
  playlistId: z.string(),
  videoId: z.string(),
  newPosition: z.number().min(0),
}
```

---

### playlist.duplicate

**Priority:** Medium  
**Purpose:** Clone playlist  
**Complexity:** Simple

**Input:**

```typescript
{
  id: z.string(),
  title: z.string().optional(),     // Defaults to "Copy of {original}"
}
```

**Response:**

```typescript
{
  playlist: Playlist;
}
```

---

### playlist.share

**Priority:** Medium  
**Purpose:** Share playlist with users or via link  
**Complexity:** Medium

**Input:**

```typescript
{
  playlistId: z.string(),
  shareType: z.enum(['users', 'link']),
  // For user sharing
  userIds: z.array(z.string()).optional(),
  role: z.enum(['viewer', 'editor']).default('viewer'),
  // For link sharing
  linkSettings: z.object({
    expiresAt: z.date().optional(),
    password: z.string().optional(),
    allowDownload: z.boolean().default(false),
  }).optional(),
}
```

**Response:**

```typescript
{
  shareUrl?: string;               // For link sharing
  sharedWith?: Array<{
    userId: string;
    role: string;
  }>;
}
```

---

### playlist.getShared

**Priority:** Medium  
**Purpose:** Get playlists shared with user  
**Complexity:** Simple

**Input:**

```typescript
{
  limit: z.number().default(20),
  cursor: z.string().optional(),
}
```

---

### playlist.merge

**Priority:** Low  
**Purpose:** Combine multiple playlists  
**Complexity:** Medium

**Input:**

```typescript
{
  playlistIds: z.array(z.string()).min(2).max(10),
  title: z.string(),
  removeDuplicates: z.boolean().default(true),
}
```

---

## 🎯 Scale Endpoints

### playlist.createSmart

**Priority:** Medium  
**Purpose:** Create auto-updating smart playlist  
**Complexity:** Complex

**Input:**

```typescript
{
  title: z.string().min(1).max(100),
  rules: z.object({
    projectIds: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    uploadedAfter: z.date().optional(),
    uploadedBy: z.array(z.string()).optional(),
    minDuration: z.number().optional(),
    maxDuration: z.number().optional(),
    sortBy: z.enum(['created', 'updated', 'title', 'duration']).default('created'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    limit: z.number().min(1).max(500).optional(),
  }),
  visibility: z.enum(['private', 'team']).default('private'),
}
```

**Example - Recent uploads:**

```typescript
await trpc.playlist.createSmart.mutate({
  title: "Recent Uploads",
  rules: {
    uploadedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    sortBy: "created",
    sortOrder: "desc",
    limit: 50,
  },
});
```

**Example - Project highlights:**

```typescript
await trpc.playlist.createSmart.mutate({
  title: "Marketing Highlights",
  rules: {
    projectIds: ["project_marketing"],
    tags: ["highlight", "approved"],
    sortBy: "updated",
    sortOrder: "desc",
  },
});
```

---

### playlist.setPresentation

**Priority:** Low  
**Purpose:** Configure presentation mode  
**Complexity:** Simple

**Input:**

```typescript
{
  playlistId: z.string(),
  settings: z.object({
    autoPlay: z.boolean().default(true),
    loop: z.boolean().default(false),
    showTitles: z.boolean().default(true),
    transitionType: z.enum(['none', 'fade', 'slide']).default('fade'),
    transitionDuration: z.number().min(0).max(2000).default(500),
  }),
}
```

---

### playlist.getAnalytics

**Priority:** Low  
**Purpose:** View playlist engagement stats  
**Complexity:** Medium

**Response:**

```typescript
{
  analytics: {
    totalViews: number;
    uniqueViewers: number;
    averageWatchTime: number;      // Seconds
    completionRate: number;        // Percentage
    videoStats: Array<{
      videoId: string;
      views: number;
      averageWatchTime: number;
      dropOffRate: number;
    }>;
    viewsByDay: Array<{
      date: string;
      views: number;
    }>;
  };
}
```

---

## 🎨 Use Cases

### Client Presentation

```typescript
// Create curated playlist for client review
const { playlist } = await trpc.playlist.create.mutate({
  title: "Brand Campaign - Final Cuts",
  description: "Approved videos for client presentation",
  visibility: "private",
});

// Add videos in specific order
await trpc.playlist.addVideos.mutate({
  playlistId: playlist.id,
  videoIds: ["intro", "product_hero", "testimonials", "cta"],
});

// Configure presentation mode
await trpc.playlist.setPresentation.mutate({
  playlistId: playlist.id,
  settings: {
    autoPlay: true,
    transitionType: "fade",
    showTitles: true,
  },
});

// Share via link
const { shareUrl } = await trpc.playlist.share.mutate({
  playlistId: playlist.id,
  shareType: "link",
  linkSettings: {
    expiresAt: new Date("2025-02-01"),
    password: "client2025",
  },
});
```

### Team Organization

```typescript
// Smart playlist for team review queue
await trpc.playlist.createSmart.mutate({
  title: "Pending Review",
  visibility: "team",
  rules: {
    tags: ["needs-review"],
    sortBy: "created",
    sortOrder: "asc",
  },
});
```

---

## 🧪 Testing Scenarios

### Post-Launch Testing
- [ ] Create playlist with videos
- [ ] Create empty playlist
- [ ] Add videos to playlist
- [ ] Remove videos from playlist
- [ ] Update playlist metadata
- [ ] Delete playlist
- [ ] Access control (owner only)

### Ordering Testing
- [ ] Reorder entire playlist
- [ ] Move single video
- [ ] Position updates on remove

### Sharing Testing
- [ ] Share with specific users
- [ ] Create share link
- [ ] Password-protected link
- [ ] Expiring link

### Smart Playlist Testing
- [ ] Create with tag filter
- [ ] Create with date filter
- [ ] Auto-update on new video
- [ ] Respect limit setting

---

## 📚 Related Documentation

- [Videos API](./04-videos) - Video sources
- [Tags API](./17-tags) - Tag filtering
- [Guest Access API](./20-guest-access) - External sharing

---

## 🔗 External Resources

- [Drag and Drop Reordering](https://dndkit.com/)
- [Playlist UX Patterns](https://www.nngroup.com/articles/list-reordering/)
