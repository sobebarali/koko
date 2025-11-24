---
title: Projects API
description: Project creation, management, organization, and collaboration endpoints
---

# 📁 Projects API

## Overview

Projects are the primary organizational unit in Artellio. Each project contains videos, comments, and collaborators. Users create projects to organize their video collaboration work.

---

## 📌 Quick Reference

### MVP Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `project.create` | Mutation | Yes | Create new project |
| `project.getById` | Query | Yes | Get project details |
| `project.getAll` | Query | Yes | List user's projects |
| `project.update` | Mutation | Yes | Update project metadata |
| `project.delete` | Mutation | Yes | Delete project |

### Future Endpoints

#### Post-Launch (Month 1-2)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `project.archive` | Mutation | Yes | Archive project | High |
| `project.restore` | Mutation | Yes | Restore archived project | High |
| `project.duplicate` | Mutation | Yes | Duplicate project | Medium |

#### Growth (Month 3-6)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `project.search` | Query | Yes | Search projects | High |
| `project.getStats` | Query | Yes | Project statistics | Medium |
| `project.bulkDelete` | Mutation | Yes | Delete multiple projects | Low |

#### Scale (Month 6+)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `project.template.create` | Mutation | Yes | Create project template | Medium |
| `project.template.use` | Mutation | Yes | Create from template | Medium |

---

## 📦 Data Models

### Project

```typescript
interface Project {
  id: string;                      // MongoDB ObjectId
  name: string;                    // Project name
  description?: string;            // Optional description
  ownerId: string;                 // User who created project
  
  // Status
  status: ProjectStatus;           // active | archived | deleted
  
  // Metadata
  color?: string;                  // Hex color for UI (#FF5733)
  thumbnail?: string;              // Project thumbnail URL
  tags: string[];                  // Organizational tags
  
  // Counts (denormalized for performance)
  videoCount: number;              // Total videos
  memberCount: number;             // Total members
  commentCount: number;            // Total comments across all videos
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
  archivedAt?: DateTime;           // When archived
  deletedAt?: DateTime;            // Soft delete timestamp
}

enum ProjectStatus {
  ACTIVE = "active",               // Normal state
  ARCHIVED = "archived",           // Read-only, hidden from main list
  DELETED = "deleted"              // Soft deleted (30-day grace)
}
```

### ProjectMember

```typescript
interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  
  // Permissions
  canUpload: boolean;
  canComment: boolean;
  canInvite: boolean;
  
  // Metadata
  joinedAt: DateTime;
  invitedBy?: string;              // User ID who invited
}

enum ProjectRole {
  OWNER = "owner",                 // Full control
  EDITOR = "editor",               // Can upload/edit/delete videos
  REVIEWER = "reviewer",           // Can comment only
  VIEWER = "viewer"                // Read-only
}
```

### Prisma Schema

```prisma
model Project {
  id          String        @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  description String?
  ownerId     String        @db.ObjectId
  
  status      ProjectStatus @default(ACTIVE)
  color       String?
  thumbnail   String?
  tags        String[]
  
  videoCount   Int          @default(0)
  memberCount  Int          @default(1)
  commentCount Int          @default(0)
  
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  archivedAt  DateTime?
  deletedAt   DateTime?
  
  // Relations
  owner       User          @relation("ProjectOwner", fields: [ownerId], references: [id])
  members     ProjectMember[]
  videos      Video[]
  
  @@index([ownerId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@map("project")
}

model ProjectMember {
  id        String      @id @default(auto()) @map("_id") @db.ObjectId
  projectId String      @db.ObjectId
  userId    String      @db.ObjectId
  role      ProjectRole @default(VIEWER)
  
  canUpload  Boolean    @default(false)
  canComment Boolean    @default(true)
  canInvite  Boolean    @default(false)
  
  joinedAt  DateTime    @default(now())
  invitedBy String?     @db.ObjectId
  
  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])
  @@index([userId])
  @@map("project_member")
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

enum ProjectRole {
  OWNER
  EDITOR
  REVIEWER
  VIEWER
}
```

---

## 🚀 MVP Endpoints

### 1. project.create

**Status:** ✅ MVP

**Purpose:** Create a new project

**Type:** Mutation

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
}
```

**Response Schema:**

```typescript
{
  project: Project & {
    members: Array<{
      id: string;
      userId: string;
      role: ProjectRole;
      user: {
        id: string;
        name: string;
        image?: string;
      };
    }>;
  };
}
```

**Example Request:**

```typescript
const { project } = await trpc.project.create.mutate({
  name: "Product Demo Videos",
  description: "All demo videos for Q1 2025 launch",
  color: "#4F46E5",
  tags: ["demo", "product", "q1-2025"],
});
```

**Example Response:**

```json
{
  "project": {
    "id": "507f1f77bcf86cd799439020",
    "name": "Product Demo Videos",
    "description": "All demo videos for Q1 2025 launch",
    "ownerId": "507f1f77bcf86cd799439011",
    "status": "active",
    "color": "#4F46E5",
    "tags": ["demo", "product", "q1-2025"],
    "videoCount": 0,
    "memberCount": 1,
    "commentCount": 0,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z",
    "members": [
      {
        "id": "507f1f77bcf86cd799439021",
        "userId": "507f1f77bcf86cd799439011",
        "role": "owner",
        "user": {
          "id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "image": "https://cdn.artellio.com/avatars/john.jpg"
        }
      }
    ]
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `BAD_REQUEST` - Invalid input (name too long, invalid color, etc.)

**Business Rules:**

1. User who creates project automatically becomes OWNER
2. Owner automatically added as project member
3. Default permissions: owner has all permissions
4. Project starts with status ACTIVE
5. videoCount, memberCount, commentCount start at 0 (except memberCount = 1)
6. Color must be valid hex code if provided

**Database Operations:**

```typescript
// Transaction: Create project + add owner as member
const project = await db.project.create({
  data: {
    name: input.name,
    description: input.description,
    ownerId: ctx.session.user.id,
    color: input.color,
    tags: input.tags || [],
    status: 'ACTIVE',
    members: {
      create: {
        userId: ctx.session.user.id,
        role: 'OWNER',
        canUpload: true,
        canComment: true,
        canInvite: true,
      },
    },
  },
  include: {
    members: {
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    },
  },
});
```

**Side Effects:**

- Project created
- Owner added as member with OWNER role
- Notification: "Project created" (if notifications enabled)

---

### 2. project.getById

**Status:** ✅ MVP

**Purpose:** Get project details with members and video count

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be a project member

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Response Schema:**

```typescript
{
  project: Project & {
    owner: {
      id: string;
      name: string;
      image?: string;
    };
    members: Array<{
      id: string;
      userId: string;
      role: ProjectRole;
      joinedAt: DateTime;
      user: {
        id: string;
        name: string;
        image?: string;
      };
    }>;
    currentUserRole: ProjectRole;
    currentUserPermissions: {
      canUpload: boolean;
      canComment: boolean;
      canInvite: boolean;
      canEdit: boolean;
      canDelete: boolean;
    };
  };
}
```

**Example Request:**

```typescript
const { project } = await trpc.project.getById.query({
  id: "507f1f77bcf86cd799439020",
});

console.log(project.name); // "Product Demo Videos"
console.log(project.currentUserRole); // "owner"
console.log(project.currentUserPermissions.canUpload); // true
```

**Example Response:**

```json
{
  "project": {
    "id": "507f1f77bcf86cd799439020",
    "name": "Product Demo Videos",
    "description": "All demo videos for Q1 2025 launch",
    "status": "active",
    "videoCount": 5,
    "memberCount": 3,
    "commentCount": 42,
    "owner": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "image": "https://cdn.artellio.com/avatars/john.jpg"
    },
    "members": [
      {
        "id": "507f1f77bcf86cd799439021",
        "userId": "507f1f77bcf86cd799439011",
        "role": "owner",
        "joinedAt": "2025-01-15T10:30:00Z",
        "user": {
          "id": "507f1f77bcf86cd799439011",
          "name": "John Doe"
        }
      }
    ],
    "currentUserRole": "owner",
    "currentUserPermissions": {
      "canUpload": true,
      "canComment": true,
      "canInvite": true,
      "canEdit": true,
      "canDelete": true
    }
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not a project member
- `NOT_FOUND` - Project does not exist or is deleted

**Business Rules:**

1. Must be project member to view
2. Archived projects still accessible to members
3. Deleted projects return NOT_FOUND
4. currentUserPermissions calculated based on role

---

### 3. project.getAll

**Status:** ✅ MVP

**Purpose:** List all projects user has access to

**Type:** Query

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  // Pagination
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  
  // Filtering
  status: z.enum(['active', 'archived']).default('active'),
  ownedByMe: z.boolean().optional(), // Only projects I own
  
  // Sorting
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}
```

**Response Schema:**

```typescript
{
  projects: Array<Project & {
    owner: { id: string; name: string; image?: string };
    currentUserRole: ProjectRole;
  }>;
  nextCursor?: string;
  total: number;
}
```

**Example Request:**

```typescript
const { projects, nextCursor, total } = await trpc.project.getAll.query({
  limit: 20,
  status: 'active',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
});
```

**Example Response:**

```json
{
  "projects": [
    {
      "id": "507f1f77bcf86cd799439020",
      "name": "Product Demo Videos",
      "status": "active",
      "videoCount": 5,
      "memberCount": 3,
      "updatedAt": "2025-01-16T14:30:00Z",
      "owner": {
        "id": "507f1f77bcf86cd799439011",
        "name": "John Doe"
      },
      "currentUserRole": "owner"
    }
  ],
  "nextCursor": "507f1f77bcf86cd799439021",
  "total": 12
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in

**Business Rules:**

1. Returns only projects user is a member of
2. Archived projects only shown if status=archived
3. Deleted projects never returned
4. Sorted by updatedAt by default (most recently active)

---

### 4. project.update

**Status:** ✅ MVP

**Purpose:** Update project metadata

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner or editor

**Input Schema:**

```typescript
{
  id: z.string(),
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
}
```

**Response Schema:**

```typescript
{
  project: Project;
}
```

**Example Request:**

```typescript
const { project } = await trpc.project.update.mutate({
  id: "507f1f77bcf86cd799439020",
  name: "Product Demo Videos - Q1 2025",
  description: "Updated for new launch timeline",
  tags: ["demo", "product", "q1-2025", "priority"],
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not owner or editor
- `NOT_FOUND` - Project does not exist
- `BAD_REQUEST` - Invalid input

**Business Rules:**

1. Only owner and editors can update
2. All fields optional (partial update)
3. Updates `updatedAt` timestamp automatically
4. Cannot update status (use archive/restore endpoints)

---

### 5. project.delete

**Status:** ✅ MVP

**Purpose:** Delete a project (soft delete with 30-day grace period)

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner

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

**Example Request:**

```typescript
await trpc.project.delete.mutate({
  id: "507f1f77bcf86cd799439020",
});

// Project soft deleted, can be restored within 30 days
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not project owner
- `NOT_FOUND` - Project does not exist

**Business Rules:**

1. **Only owner** can delete project
2. **Soft delete:** Sets `deletedAt` timestamp, status = DELETED
3. **30-day grace period:** Can be restored before permanent deletion
4. **Cascade behavior:**
   - Videos: Soft deleted with project
   - Comments: Soft deleted with videos
   - Members: Remain (for restore)
5. **Hard delete:** Background job after 30 days permanently removes all data

**Database Operations:**

```typescript
// Soft delete
const project = await db.project.update({
  where: { id: input.id },
  data: {
    status: 'DELETED',
    deletedAt: new Date(),
  },
});

// Cascade: Soft delete all videos
await db.video.updateMany({
  where: { projectId: input.id },
  data: {
    deletedAt: new Date(),
  },
});
```

**Side Effects:**

- Project status set to DELETED
- All videos in project soft deleted
- Project removed from user's project list
- Notification sent to all members
- Scheduled for hard delete in 30 days

**Related Endpoints:**

- `project.restore` (Post-Launch) - Restore deleted project

---

## 🔮 Future Endpoints

### Post-Launch

#### project.archive
**Priority:** High  
**Purpose:** Archive a project (read-only, hide from main list)  
**Why Later:** Can use delete for MVP, archive is better UX  
**Complexity:** Simple (status update)

**Input:**
```typescript
{ id: z.string() }
```

**Business Rules:**
- Sets status to ARCHIVED
- Project becomes read-only
- Hidden from default project list
- Can still view/download videos
- Only owner can archive

---

#### project.restore
**Priority:** High  
**Purpose:** Restore archived or deleted project  
**Why Later:** Requires archive/delete first  
**Complexity:** Simple (status update)

**Input:**
```typescript
{ id: z.string() }
```

**Business Rules:**
- Works for ARCHIVED or DELETED projects
- Sets status back to ACTIVE
- Only available within 30 days for deleted projects
- Only owner can restore

---

#### project.duplicate
**Priority:** Medium  
**Purpose:** Create copy of project with all settings (not videos)  
**Why Later:** Power user feature, not essential  
**Complexity:** Medium (deep copy logic)

**Input:**
```typescript
{
  id: z.string(),
  newName: z.string(),
  includeMembers: z.boolean().default(false),
}
```

**What's Copied:**
- Project metadata (name, description, color, tags)
- Project settings
- Optionally: members (not by default)

**What's NOT Copied:**
- Videos
- Comments
- Activity history

---

### Growth Phase

#### project.search
**Priority:** High  
**Purpose:** Full-text search across projects  
**Why Later:** Small project count doesn't need search  
**Complexity:** Medium (search indexing)

**Input:**
```typescript
{
  query: z.string().min(2),
  filters: {
    status: z.enum(['active', 'archived']).optional(),
    tags: z.array(z.string()).optional(),
  },
}
```

---

#### project.getStats
**Priority:** Medium  
**Purpose:** Get project analytics and statistics  
**Why Later:** Analytics not critical for MVP  
**Complexity:** Medium (aggregation queries)

**Response:**
```typescript
{
  stats: {
    totalVideos: number;
    totalComments: number;
    totalViews: number;
    avgCommentsPerVideo: number;
    mostActiveMembers: Array<{ userId: string; name: string; activityCount: number }>;
    recentActivity: Array<Activity>;
  };
}
```

---

#### project.bulkDelete
**Priority:** Low  
**Purpose:** Delete multiple projects at once  
**Why Later:** Power user feature  
**Complexity:** Medium (batch operations)

---

### Scale Phase

#### project.template.create
**Priority:** Medium  
**Purpose:** Save project as reusable template  
**Why Later:** Advanced feature for power users  
**Complexity:** Medium (template system)

---

#### project.template.use
**Priority:** Medium  
**Purpose:** Create project from template  
**Why Later:** Requires templates first  
**Complexity:** Medium (template instantiation)

---

## 🔒 Permission System

### Role Hierarchy

```
OWNER > EDITOR > REVIEWER > VIEWER
```

### Default Permissions by Role

| Permission | Owner | Editor | Reviewer | Viewer |
|------------|-------|--------|----------|--------|
| View project | ✅ | ✅ | ✅ | ✅ |
| Upload video | ✅ | ✅ | ❌ | ❌ |
| Delete video | ✅ | ✅ | ❌ | ❌ |
| Comment | ✅ | ✅ | ✅ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Edit project | ✅ | ✅ | ❌ | ❌ |
| Delete project | ✅ | ❌ | ❌ | ❌ |
| Archive project | ✅ | ❌ | ❌ | ❌ |

**Note:** Permissions can be customized per member in Growth phase

---

## 🧪 Testing Scenarios

### MVP Testing
- [ ] Create project with valid data
- [ ] Create project with name too long (should fail)
- [ ] Create project with invalid color hex
- [ ] Get project by ID (as member)
- [ ] Get project by ID (as non-member - should fail)
- [ ] List all projects (active only)
- [ ] Update project as owner
- [ ] Update project as editor
- [ ] Update project as viewer (should fail)
- [ ] Delete project as owner
- [ ] Delete project as editor (should fail)
- [ ] Deleted project removed from list

### Permission Testing
- [ ] Owner can do everything
- [ ] Editor can upload/comment but not delete project
- [ ] Reviewer can comment but not upload
- [ ] Viewer can only view

---

## 📚 Related Documentation

- [Videos API](./04-videos) - Project contains videos
- [Comments API](./05-comments) - Comments belong to project videos
- [Teams API](./08-teams) - Team-owned projects *(Growth)*
- [Permissions API](./09-permissions) - Sharing projects *(Post-Launch)*

---

## 🔗 External Resources

- [Project Management Best Practices](https://asana.com/resources/project-management-best-practices)
- [Color Picker for Project Colors](https://colorhunt.co/)
