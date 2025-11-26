---
title: Folders API
description: Organize videos within projects using folders and subfolders
---

# 📁 Folders API

## Overview

The Folders domain enables hierarchical organization of videos within projects. Users can create folders and subfolders to structure their content, making it easier to manage large video libraries.

---

## 📌 Quick Reference

### Post-Launch Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `folder.create` | Mutation | Yes | Create new folder |
| `folder.getAll` | Query | Yes | List folders in project |
| `folder.getById` | Query | Yes | Get folder with contents |
| `folder.update` | Mutation | Yes | Rename/update folder |
| `folder.delete` | Mutation | Yes | Delete folder |
| `folder.move` | Mutation | Yes | Move folder to new parent |

### Growth Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `folder.moveItems` | Mutation | Yes | Move videos between folders | High |
| `folder.getTree` | Query | Yes | Get full folder hierarchy | High |
| `folder.duplicate` | Mutation | Yes | Duplicate folder structure | Medium |
| `folder.setColor` | Mutation | Yes | Set folder color | Low |
| `folder.bulkMove` | Mutation | Yes | Move multiple items | Low |

### Scale Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `folder.setPermissions` | Mutation | Yes | Folder-level permissions | Medium |
| `folder.archive` | Mutation | Yes | Archive folder | Low |
| `folder.getStats` | Query | Yes | Folder statistics | Low |

---

## 📦 Data Models

### Folder

```typescript
interface Folder {
  id: string;                      // Unique identifier
  projectId: string;               // Parent project
  parentId?: string;               // Parent folder (null = root)
  
  // Metadata
  name: string;                    // Folder name
  description?: string;            // Optional description
  color?: string;                  // Hex color for UI
  icon?: string;                   // Custom icon identifier
  
  // Hierarchy
  path: string;                    // Full path (e.g., "/Marketing/Q1/Ads")
  depth: number;                   // Nesting level (0 = root)
  
  // Counts (denormalized)
  videoCount: number;              // Direct videos in folder
  folderCount: number;             // Direct subfolders
  totalVideoCount: number;         // Including subfolders
  
  // Ordering
  sortOrder: number;               // Manual sort position
  
  // Status
  archived: boolean;
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
  createdBy: string;
}
```

### Drizzle Schema

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const folder = sqliteTable(
  "folder",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    parentId: text("parent_id")
      .references(() => folder.id, { onDelete: "cascade" }),
    
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"),
    icon: text("icon"),
    
    path: text("path").notNull(),
    depth: integer("depth").default(0).notNull(),
    
    videoCount: integer("video_count").default(0).notNull(),
    folderCount: integer("folder_count").default(0).notNull(),
    totalVideoCount: integer("total_video_count").default(0).notNull(),
    
    sortOrder: integer("sort_order").default(0).notNull(),
    
    archived: integer("archived", { mode: "boolean" })
      .default(false)
      .notNull(),
    
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("folder_project_idx").on(table.projectId),
    index("folder_parent_idx").on(table.parentId),
    index("folder_path_idx").on(table.projectId, table.path),
  ]
);

// Update video table to include folderId
// ALTER TABLE video ADD COLUMN folder_id TEXT REFERENCES folder(id);
```

---

## 🚀 Post-Launch Endpoints

### 1. folder.create

**Status:** 🔄 Post-Launch

**Purpose:** Create a new folder in a project

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner or editor

**Input Schema:**

```typescript
{
  projectId: z.string(),
  parentId: z.string().optional(),          // null = root folder
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
}
```

**Response Schema:**

```typescript
{
  folder: Folder;
}
```

**Example Request:**

```typescript
const { folder } = await trpc.folder.create.mutate({
  projectId: "507f1f77bcf86cd799439011",
  parentId: "507f1f77bcf86cd799439050", // Inside "Marketing" folder
  name: "Q1 2025 Campaigns",
  color: "#4F46E5",
});
```

**Example Response:**

```json
{
  "folder": {
    "id": "507f1f77bcf86cd799439060",
    "projectId": "507f1f77bcf86cd799439011",
    "parentId": "507f1f77bcf86cd799439050",
    "name": "Q1 2025 Campaigns",
    "path": "/Marketing/Q1 2025 Campaigns",
    "depth": 2,
    "color": "#4F46E5",
    "videoCount": 0,
    "folderCount": 0,
    "totalVideoCount": 0,
    "sortOrder": 0,
    "archived": false,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not owner/editor
- `NOT_FOUND` - Project or parent folder not found
- `CONFLICT` - Folder with same name exists in parent
- `BAD_REQUEST` - Max depth exceeded (10 levels)

**Business Rules:**

1. Folder names unique within parent
2. Maximum depth: 10 levels
3. Path automatically computed from hierarchy
4. Parent folder's `folderCount` incremented
5. Sort order defaults to last position

---

### 2. folder.getAll

**Status:** 🔄 Post-Launch

**Purpose:** List all folders in a project (flat list)

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have view access to project

**Input Schema:**

```typescript
{
  projectId: z.string(),
  parentId: z.string().nullable().optional(), // null = root, undefined = all
  includeArchived: z.boolean().default(false),
}
```

**Response Schema:**

```typescript
{
  folders: Array<Folder & {
    creator: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  total: number;
}
```

**Example Request:**

```typescript
// Get root folders only
const { folders } = await trpc.folder.getAll.query({
  projectId: "507f1f77bcf86cd799439011",
  parentId: null,
});

// Get all folders
const { folders: allFolders } = await trpc.folder.getAll.query({
  projectId: "507f1f77bcf86cd799439011",
});
```

---

### 3. folder.getById

**Status:** 🔄 Post-Launch

**Purpose:** Get folder details with contents

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have view access to project

**Input Schema:**

```typescript
{
  id: z.string(),
  includeVideos: z.boolean().default(true),
  includeSubfolders: z.boolean().default(true),
}
```

**Response Schema:**

```typescript
{
  folder: Folder & {
    creator: { id: string; name: string; image?: string };
    parent?: { id: string; name: string };
    breadcrumbs: Array<{ id: string; name: string }>;
  };
  videos?: Array<Video>;          // If includeVideos
  subfolders?: Array<Folder>;     // If includeSubfolders
}
```

**Example Response:**

```json
{
  "folder": {
    "id": "507f1f77bcf86cd799439060",
    "name": "Q1 2025 Campaigns",
    "path": "/Marketing/Q1 2025 Campaigns",
    "breadcrumbs": [
      { "id": "507f1f77bcf86cd799439050", "name": "Marketing" },
      { "id": "507f1f77bcf86cd799439060", "name": "Q1 2025 Campaigns" }
    ]
  },
  "videos": [
    { "id": "...", "title": "Brand Video v1", "thumbnailUrl": "..." }
  ],
  "subfolders": [
    { "id": "...", "name": "Facebook Ads", "videoCount": 5 }
  ]
}
```

---

### 4. folder.update

**Status:** 🔄 Post-Launch

**Purpose:** Update folder metadata

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner or editor

**Input Schema:**

```typescript
{
  id: z.string(),
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable().optional(),
}
```

**Response Schema:**

```typescript
{
  folder: Folder;
}
```

**Business Rules:**

1. Renaming updates `path` for folder and all descendants
2. Name must be unique within parent

---

### 5. folder.delete

**Status:** 🔄 Post-Launch

**Purpose:** Delete a folder

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner

**Input Schema:**

```typescript
{
  id: z.string(),
  moveContentsTo: z.string().nullable().optional(), // Move videos/subfolders here
}
```

**Response Schema:**

```typescript
{
  success: boolean;
  movedItems: {
    videos: number;
    folders: number;
  };
}
```

**Example Request:**

```typescript
// Delete and move contents to parent folder
await trpc.folder.delete.mutate({
  id: "507f1f77bcf86cd799439060",
  moveContentsTo: "507f1f77bcf86cd799439050", // Parent folder
});

// Delete and move contents to root
await trpc.folder.delete.mutate({
  id: "507f1f77bcf86cd799439060",
  moveContentsTo: null, // Root level
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not project owner
- `NOT_FOUND` - Folder not found
- `BAD_REQUEST` - Cannot move to descendant folder

**Business Rules:**

1. Only project owner can delete folders
2. Contents moved to specified location (not deleted)
3. If no `moveContentsTo`, contents moved to parent
4. Updates all affected counts

---

### 6. folder.move

**Status:** 🔄 Post-Launch

**Purpose:** Move folder to a new parent

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner or editor

**Input Schema:**

```typescript
{
  id: z.string(),
  newParentId: z.string().nullable(), // null = move to root
}
```

**Response Schema:**

```typescript
{
  folder: Folder;
}
```

**Error Codes:**

- `BAD_REQUEST` - Cannot move folder into itself or descendant
- `BAD_REQUEST` - Would exceed max depth (10)
- `CONFLICT` - Folder with same name exists in target

**Business Rules:**

1. Cannot move folder into itself
2. Cannot move folder into its own descendant
3. Path updated for folder and all descendants
4. Counts updated on old and new parent

---

## 🔮 Growth Endpoints

### folder.moveItems

**Priority:** High  
**Purpose:** Move videos between folders  
**Complexity:** Simple

**Input:**
```typescript
{
  videoIds: z.array(z.string()).min(1).max(100),
  targetFolderId: z.string().nullable(), // null = root
}
```

**Response:**
```typescript
{
  movedCount: number;
}
```

---

### folder.getTree

**Priority:** High  
**Purpose:** Get full folder hierarchy as tree  
**Complexity:** Medium

**Input:**
```typescript
{
  projectId: z.string(),
  includeVideoCounts: z.boolean().default(true),
}
```

**Response:**
```typescript
{
  tree: FolderTreeNode[];
}

interface FolderTreeNode {
  id: string;
  name: string;
  color?: string;
  videoCount: number;
  children: FolderTreeNode[];
}
```

**Example Response:**

```json
{
  "tree": [
    {
      "id": "1",
      "name": "Marketing",
      "videoCount": 3,
      "children": [
        {
          "id": "2",
          "name": "Q1 Campaigns",
          "videoCount": 5,
          "children": []
        },
        {
          "id": "3",
          "name": "Q2 Campaigns",
          "videoCount": 2,
          "children": []
        }
      ]
    },
    {
      "id": "4",
      "name": "Product",
      "videoCount": 10,
      "children": []
    }
  ]
}
```

---

### folder.duplicate

**Priority:** Medium  
**Purpose:** Duplicate folder structure (without videos)  
**Complexity:** Medium

**Input:**
```typescript
{
  id: z.string(),
  newName: z.string(),
  includeSubfolders: z.boolean().default(true),
}
```

---

### folder.setColor

**Priority:** Low  
**Purpose:** Set folder color for visual organization  
**Complexity:** Simple

**Input:**
```typescript
{
  id: z.string(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable(),
}
```

---

### folder.bulkMove

**Priority:** Low  
**Purpose:** Move multiple folders at once  
**Complexity:** Medium

**Input:**
```typescript
{
  folderIds: z.array(z.string()).min(1).max(50),
  targetParentId: z.string().nullable(),
}
```

---

## 🎯 Scale Endpoints

### folder.setPermissions

**Priority:** Medium  
**Purpose:** Set folder-level access permissions  
**Complexity:** Complex

**Input:**
```typescript
{
  id: z.string(),
  permissions: z.array(z.object({
    userId: z.string(),
    role: z.enum(['viewer', 'commenter', 'editor']),
  })),
  inheritFromParent: z.boolean().default(true),
}
```

---

### folder.archive

**Priority:** Low  
**Purpose:** Archive folder (hide from default view)  
**Complexity:** Simple

**Input:**
```typescript
{
  id: z.string(),
  archived: z.boolean(),
}
```

---

### folder.getStats

**Priority:** Low  
**Purpose:** Get folder statistics  
**Complexity:** Medium

**Response:**
```typescript
{
  stats: {
    totalVideos: number;
    totalDuration: number;     // Seconds
    totalSize: number;         // Bytes
    totalComments: number;
    lastActivity: DateTime;
    topContributors: Array<{
      userId: string;
      name: string;
      videoCount: number;
    }>;
  };
}
```

---

## 📂 Folder Hierarchy

### Visual Structure

```
Project Root
├── 📁 Marketing
│   ├── 📁 Q1 2025 Campaigns
│   │   ├── 🎬 Brand Video v1
│   │   └── 🎬 Product Launch
│   └── 📁 Social Media
│       ├── 🎬 Instagram Reel
│       └── 🎬 TikTok Ad
├── 📁 Product
│   └── 📁 Tutorials
│       └── 🎬 Getting Started
└── 📁 Archive (archived)
```

### Path Format

- Paths are human-readable: `/Marketing/Q1 2025 Campaigns`
- Used for breadcrumb navigation
- Updated on rename/move
- Indexed for fast lookups

### Depth Limits

- **Maximum depth:** 10 levels
- **Recommended depth:** 3-5 levels for usability
- Deeper hierarchies may impact navigation UX

---

## 🧪 Testing Scenarios

### Post-Launch Testing
- [ ] Create root folder
- [ ] Create nested folder
- [ ] Create folder at max depth (10)
- [ ] Create folder exceeding max depth (should fail)
- [ ] Duplicate folder name in same parent (should fail)
- [ ] Rename folder updates paths
- [ ] Move folder to new parent
- [ ] Move folder to root
- [ ] Move folder into itself (should fail)
- [ ] Delete folder and move contents
- [ ] Delete folder with subfolders

### Hierarchy Testing
- [ ] Get folder tree
- [ ] Breadcrumb navigation
- [ ] Count updates on add/remove
- [ ] Path updates on move/rename

---

## 📚 Related Documentation

- [Projects API](./03-projects) - Parent container
- [Videos API](./04-videos) - Folder contents
- [Assets API](./11-assets) - Non-video files

---

## 🔗 External Resources

- [File System UX Best Practices](https://www.nngroup.com/articles/flat-vs-deep-hierarchy/)
- [Tree Component Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
