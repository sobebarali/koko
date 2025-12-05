---
title: Comparisons API
description: Compare video versions side-by-side
---

# 🔀 Comparisons API

## Overview

The Comparisons domain enables side-by-side comparison of video versions, helping teams review changes, identify differences, and make informed decisions during the creative process.

---

## 📌 Quick Reference

### Post-Launch Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `comparison.create` | Mutation | Yes | Create new comparison |
| `comparison.getById` | Query | Yes | Get comparison details |
| `comparison.getAll` | Query | Yes | List comparisons |
| `comparison.delete` | Mutation | Yes | Delete comparison |

### Growth Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `comparison.addComment` | Mutation | Yes | Comment on comparison | High |
| `comparison.share` | Mutation | Yes | Share comparison | Medium |
| `comparison.setPreferences` | Mutation | Yes | Set view preferences | Low |
| `comparison.generateDiff` | Mutation | Yes | Auto-detect differences | Low |

### Scale Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `comparison.createBatch` | Mutation | Yes | Compare multiple versions | Medium |
| `comparison.getHistory` | Query | Yes | Version comparison history | Low |

---

## 📦 Data Models

### Comparison

```typescript
interface Comparison {
  id: string;                      // Unique identifier
  createdBy: string;               // Creator
  projectId: string;               // Parent project
  
  // Videos being compared
  leftVideo: {
    videoId: string;
    versionId?: string;            // Specific version
    label?: string;                // Custom label (e.g., "Before")
  };
  rightVideo: {
    videoId: string;
    versionId?: string;
    label?: string;                // e.g., "After"
  };
  
  // Metadata
  title?: string;
  description?: string;
  
  // View Settings
  viewMode: ComparisonViewMode;
  syncPlayback: boolean;           // Sync video playback
  
  // Sharing
  shareToken?: string;
  shareExpiresAt?: DateTime;
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}

type ComparisonViewMode = 
  | 'side_by_side'      // Two videos side by side
  | 'overlay'           // Overlay with opacity slider
  | 'swipe'             // Swipe to reveal
  | 'difference';       // Highlight differences

interface ComparisonComment {
  id: string;
  comparisonId: string;
  userId: string;
  
  // Position
  timestamp: number;               // Video timestamp
  side: 'left' | 'right' | 'both';
  
  content: string;
  
  // Status
  resolved: boolean;
  
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Drizzle Schema

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const comparison = sqliteTable(
  "comparison",
  {
    id: text("id").primaryKey(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    
    leftVideoId: text("left_video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    leftVersionId: text("left_version_id"),
    leftLabel: text("left_label"),
    
    rightVideoId: text("right_video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    rightVersionId: text("right_version_id"),
    rightLabel: text("right_label"),
    
    title: text("title"),
    description: text("description"),
    
    viewMode: text("view_mode", { 
      enum: ["side_by_side", "overlay", "swipe", "difference"] 
    }).default("side_by_side").notNull(),
    syncPlayback: integer("sync_playback", { mode: "boolean" })
      .default(true)
      .notNull(),
    
    shareToken: text("share_token").unique(),
    shareExpiresAt: integer("share_expires_at", { mode: "timestamp_ms" }),
    
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("comparison_creator_idx").on(table.createdBy),
    index("comparison_project_idx").on(table.projectId),
    index("comparison_share_idx").on(table.shareToken),
  ]
);

export const comparisonComment = sqliteTable(
  "comparison_comment",
  {
    id: text("id").primaryKey(),
    comparisonId: text("comparison_id")
      .notNull()
      .references(() => comparison.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    timestamp: integer("timestamp").notNull(),
    side: text("side", { enum: ["left", "right", "both"] }).notNull(),
    
    content: text("content").notNull(),
    resolved: integer("resolved", { mode: "boolean" })
      .default(false)
      .notNull(),
    
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("comparison_comment_comparison_idx").on(table.comparisonId),
    index("comparison_comment_timestamp_idx").on(table.comparisonId, table.timestamp),
  ]
);
```

---

## 🚀 Post-Launch Endpoints

### 1. comparison.create

**Status:** 🔄 Post-Launch

**Purpose:** Create a new comparison between two videos

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must have view access to both videos

**Input Schema:**

```typescript
{
  projectId: z.string(),
  leftVideo: z.object({
    videoId: z.string(),
    versionId: z.string().optional(),
    label: z.string().max(50).optional(),
  }),
  rightVideo: z.object({
    videoId: z.string(),
    versionId: z.string().optional(),
    label: z.string().max(50).optional(),
  }),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  viewMode: z.enum(['side_by_side', 'overlay', 'swipe', 'difference']).default('side_by_side'),
  syncPlayback: z.boolean().default(true),
}
```

**Response Schema:**

```typescript
{
  comparison: Comparison & {
    leftVideo: Video;
    rightVideo: Video;
  };
}
```

**Example Request:**

```typescript
const { comparison } = await trpc.comparison.create.mutate({
  projectId: "project_123",
  leftVideo: {
    videoId: "video_456",
    versionId: "v1",
    label: "Original",
  },
  rightVideo: {
    videoId: "video_456",
    versionId: "v2",
    label: "Color Corrected",
  },
  title: "Color Grade Review",
  viewMode: "swipe",
});
```

**Example Response:**

```json
{
  "comparison": {
    "id": "cmp_507f1f77bcf86cd799439011",
    "title": "Color Grade Review",
    "viewMode": "swipe",
    "syncPlayback": true,
    "leftVideo": {
      "id": "video_456",
      "title": "Product Hero",
      "thumbnailUrl": "https://..."
    },
    "rightVideo": {
      "id": "video_456",
      "title": "Product Hero",
      "thumbnailUrl": "https://..."
    },
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No access to video(s)
- `NOT_FOUND` - Video(s) not found
- `BAD_REQUEST` - Cannot compare video with itself (same version)

**Business Rules:**

1. Both videos must be accessible to the user
2. Can compare different videos or different versions of same video
3. Videos should ideally have similar dimensions for best experience

---

### 2. comparison.getById

**Status:** 🔄 Post-Launch

**Purpose:** Get comparison with video details

**Type:** Query

**Auth Required:** Yes (unless shared)

**Input Schema:**

```typescript
{
  id: z.string(),
  shareToken: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  comparison: Comparison & {
    creator: { id: string; name: string; image?: string };
    leftVideo: Video & {
      version?: VideoVersion;
    };
    rightVideo: Video & {
      version?: VideoVersion;
    };
    comments: ComparisonComment[];
  };
}
```

---

### 3. comparison.getAll

**Status:** 🔄 Post-Launch

**Purpose:** List comparisons

**Type:** Query

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  projectId: z.string().optional(),
  videoId: z.string().optional(),    // Comparisons involving this video
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  comparisons: Array<Comparison & {
    leftVideo: { id: string; title: string; thumbnailUrl: string };
    rightVideo: { id: string; title: string; thumbnailUrl: string };
  }>;
  nextCursor?: string;
}
```

---

### 4. comparison.delete

**Status:** 🔄 Post-Launch

**Purpose:** Delete a comparison

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be creator

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Response Schema:**

```typescript
{
  success: boolean;
}
```

---

## 🔮 Growth Endpoints

### comparison.addComment

**Priority:** High  
**Purpose:** Add comment to comparison at specific timestamp  
**Complexity:** Simple

**Input:**

```typescript
{
  comparisonId: z.string(),
  timestamp: z.number().min(0),
  side: z.enum(['left', 'right', 'both']),
  content: z.string().min(1).max(2000),
}
```

**Response:**

```typescript
{
  comment: ComparisonComment;
}
```

---

### comparison.share

**Priority:** Medium  
**Purpose:** Generate share link for comparison  
**Complexity:** Simple

**Input:**

```typescript
{
  comparisonId: z.string(),
  expiresIn: z.number().optional(),    // Hours, default 7 days
  password: z.string().optional(),
}
```

**Response:**

```typescript
{
  shareUrl: string;
  shareToken: string;
  expiresAt: DateTime;
}
```

---

### comparison.setPreferences

**Priority:** Low  
**Purpose:** Update view preferences  
**Complexity:** Simple

**Input:**

```typescript
{
  comparisonId: z.string(),
  viewMode: z.enum(['side_by_side', 'overlay', 'swipe', 'difference']).optional(),
  syncPlayback: z.boolean().optional(),
}
```

---

### comparison.generateDiff

**Priority:** Low  
**Purpose:** Auto-detect visual differences between videos  
**Complexity:** Complex

**Input:**

```typescript
{
  comparisonId: z.string(),
  sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
}
```

**Response:**

```typescript
{
  differences: Array<{
    timestamp: number;
    duration: number;
    type: 'color' | 'motion' | 'content';
    severity: 'minor' | 'moderate' | 'significant';
    region?: { x: number; y: number; width: number; height: number };
  }>;
  overallSimilarity: number;        // 0-100 percentage
}
```

---

## 🎯 Scale Endpoints

### comparison.createBatch

**Priority:** Medium  
**Purpose:** Compare multiple versions at once  
**Complexity:** Medium

**Input:**

```typescript
{
  projectId: z.string(),
  videoId: z.string(),
  versionIds: z.array(z.string()).min(2).max(10),
  title: z.string().optional(),
}
```

**Response:**

```typescript
{
  comparisons: Array<Comparison>;
  matrix: {
    versionIds: string[];
    // Similarity scores between each pair
    similarities: number[][];
  };
}
```

---

### comparison.getHistory

**Priority:** Low  
**Purpose:** Get comparison history for a video  
**Complexity:** Simple

**Input:**

```typescript
{
  videoId: z.string(),
  limit: z.number().default(20),
}
```

**Response:**

```typescript
{
  history: Array<{
    comparison: Comparison;
    outcome?: 'left_preferred' | 'right_preferred' | 'undecided';
    decidedBy?: { id: string; name: string };
    decidedAt?: DateTime;
  }>;
}
```

---

## 🎨 View Modes

### Side by Side

```
┌─────────────────┬─────────────────┐
│                 │                 │
│   Left Video    │   Right Video   │
│   (Original)    │   (Revised)     │
│                 │                 │
└─────────────────┴─────────────────┘
         ▶ Synced Playback Controls
```

### Overlay

```
┌─────────────────────────────────────┐
│                                     │
│   Videos stacked with opacity       │
│   ◄──────●─────────────────────► ↑  │
│   0%     50%                  100%  │
│                                     │
└─────────────────────────────────────┘
```

### Swipe

```
┌─────────────────────────────────────┐
│                │                    │
│   Left Video   │   Right Video      │
│                │                    │
│                │◄ Drag to compare   │
└─────────────────────────────────────┘
```

### Difference

```
┌─────────────────────────────────────┐
│                                     │
│   Highlighted areas show where      │
│   videos differ (color, motion)     │
│   ████████                          │
│        ██████████                   │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎬 Use Cases

### Version Review

```typescript
// Compare original with color-corrected version
const { comparison } = await trpc.comparison.create.mutate({
  projectId: "project_123",
  leftVideo: { videoId: "video_456", versionId: "v1", label: "Original" },
  rightVideo: { videoId: "video_456", versionId: "v2", label: "Color Graded" },
  viewMode: "swipe",
});

// Add feedback
await trpc.comparison.addComment.mutate({
  comparisonId: comparison.id,
  timestamp: 15.5,
  side: "right",
  content: "The skin tones look much better here",
});
```

### A/B Testing

```typescript
// Compare two different edits
const { comparison } = await trpc.comparison.create.mutate({
  projectId: "project_123",
  leftVideo: { videoId: "video_edit_a", label: "Edit A - Fast paced" },
  rightVideo: { videoId: "video_edit_b", label: "Edit B - Slow reveal" },
  title: "Client preference test",
  viewMode: "side_by_side",
});

// Share with client
const { shareUrl } = await trpc.comparison.share.mutate({
  comparisonId: comparison.id,
  expiresIn: 168, // 1 week
});
```

---

## 🧪 Testing Scenarios

### Post-Launch Testing
- [ ] Create comparison between two videos
- [ ] Create comparison between versions
- [ ] Get comparison with videos
- [ ] List comparisons by project
- [ ] Delete comparison
- [ ] Access control validation

### View Mode Testing
- [ ] Side by side sync playback
- [ ] Overlay opacity slider
- [ ] Swipe divider position
- [ ] Difference detection

### Sharing Testing
- [ ] Generate share link
- [ ] Access via share token
- [ ] Expired link handling
- [ ] Password protection

---

## 📚 Related Documentation

- [Videos API](./04-videos) - Video sources
- [Versions API](./07-versions) - Version management
- [Comments API](./05-comments) - Comment system

---

## 🔗 External Resources

- [Video Comparison UI Patterns](https://juxtapose.knightlab.com/)
- [Image Diff Algorithms](https://en.wikipedia.org/wiki/Image_differencing)
- [Sync Playback Implementation](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement)
