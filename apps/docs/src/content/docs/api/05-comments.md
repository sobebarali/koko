---
title: Comments API
description: Timecode-based comments, threaded replies, and collaboration feedback - Core MVP Feature
---

# 💬 Comments API

## Overview

The Comments domain enables **timecode-based feedback** on videos, which is the core collaboration feature of Artellio. Users can comment on specific moments in videos, reply to each other, and mark feedback as resolved.

---

## 📌 Quick Reference

### MVP Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `comment.create` | Mutation | Yes | Create comment with timecode |
| `comment.getAll` | Query | Yes | Get all comments for video |
| `comment.getById` | Query | Yes | Get single comment |
| `comment.reply` | Mutation | Yes | Reply to comment |
| `comment.update` | Mutation | Yes | Edit comment text |
| `comment.delete` | Mutation | Yes | Delete comment |
| `comment.resolve` | Mutation | Yes | Mark as resolved |

### Future Endpoints

#### Post-Launch (Month 1-2)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `comment.unresolve` | Mutation | Yes | Reopen resolved comment | High |
| `comment.mention` | Mutation | Yes | Mention user (@username) | High |
| `comment.search` | Query | Yes | Search comments | Medium |

#### Growth (Month 3-6)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `comment.bulkResolve` | Mutation | Yes | Resolve multiple | Medium |
| `comment.export` | Query | Yes | Export (PDF/CSV) | Medium |
| `comment.getThread` | Query | Yes | Get full thread | Low |

#### Scale (Month 6+)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `comment.translate` | Mutation | Yes | Translate comment (AI) | Low |
| `comment.summarize` | Query | Yes | AI summary | Low |

---

## 📦 Data Models

### Comment

```typescript
interface Comment {
  id: string;                      // MongoDB ObjectId
  videoId: string;                 // Parent video
  authorId: string;                // User who created comment
  
  // Content
  text: string;                    // Comment text (max 5000 chars)
  timecode: number;                // Video position in seconds
  
  // Threading
  parentId?: string;               // Reply to another comment
  replyCount: number;              // Number of replies
  
  // Status
  resolved: boolean;               // Marked as resolved
  resolvedAt?: DateTime;           // When resolved
  resolvedBy?: string;             // User who resolved
  
  // Metadata
  edited: boolean;                 // Has been edited
  editedAt?: DateTime;             // Last edit time
  
  // Mentions (Post-Launch)
  mentions: string[];              // Array of mentioned user IDs
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
  deletedAt?: DateTime;
}
```

### Prisma Schema

```prisma
model Comment {
  id       String  @id @default(auto()) @map("_id") @db.ObjectId
  videoId  String  @db.ObjectId
  authorId String  @db.ObjectId
  
  text     String
  timecode Float
  
  parentId   String? @db.ObjectId
  replyCount Int     @default(0)
  
  resolved   Boolean   @default(false)
  resolvedAt DateTime?
  resolvedBy String?   @db.ObjectId
  
  edited     Boolean   @default(false)
  editedAt   DateTime?
  
  mentions   String[]  @db.ObjectId
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  
  // Relations
  video   Video     @relation(fields: [videoId], references: [id], onDelete: Cascade)
  author  User      @relation("CommentAuthor", fields: [authorId], references: [id])
  parent  Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  replies Comment[] @relation("CommentReplies")
  
  @@index([videoId])
  @@index([authorId])
  @@index([timecode])
  @@index([parentId])
  @@index([createdAt(sort: Desc)])
  @@map("comment")
}
```

---

## 🚀 MVP Endpoints

### 1. comment.create

**Status:** ✅ MVP

**Purpose:** Create a new comment on a video at a specific timecode

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must have comment permission in project (owner/editor/reviewer)

**Input Schema:**

```typescript
{
  videoId: z.string(),
  text: z.string().min(1).max(5000).trim(),
  timecode: z.number().min(0), // Seconds into video
  parentId: z.string().optional(), // For replies
}
```

**Response Schema:**

```typescript
{
  comment: Comment & {
    author: {
      id: string;
      name: string;
      image?: string;
    };
  };
}
```

**Example Request:**

```typescript
const { comment } = await trpc.comment.create.mutate({
  videoId: "507f1f77bcf86cd799439012",
  text: "The logo appears off-center at this timestamp. Can we adjust it?",
  timecode: 45.2, // 45.2 seconds into video
});
```

**Example Response:**

```json
{
  "comment": {
    "id": "507f1f77bcf86cd799439030",
    "videoId": "507f1f77bcf86cd799439012",
    "authorId": "507f1f77bcf86cd799439011",
    "text": "The logo appears off-center at this timestamp. Can we adjust it?",
    "timecode": 45.2,
    "resolved": false,
    "replyCount": 0,
    "edited": false,
    "createdAt": "2025-01-15T14:30:00Z",
    "author": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "image": "https://cdn.artellio.com/avatars/john.jpg"
    }
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No comment permission in project
- `NOT_FOUND` - Video does not exist
- `BAD_REQUEST` - Invalid timecode (exceeds video duration)

**Business Rules:**

1. Timecode must be between 0 and video.duration
2. Text cannot be empty after trimming
3. Parent comment must exist if parentId provided
4. Parent comment must be on same video
5. Video's commentCount incremented
6. Parent comment's replyCount incremented (if reply)
7. Notification sent to video uploader (if not self)
8. Notification sent to parent comment author (if reply)

**Database Operations:**

```typescript
// Validate video exists and user has access
const video = await db.video.findUnique({
  where: { id: input.videoId },
  include: { project: { include: { members: true } } },
});

if (!video) {
  throw new TRPCError({ code: 'NOT_FOUND' });
}

// Check timecode valid
if (input.timecode > video.duration) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `Timecode ${input.timecode} exceeds video duration ${video.duration}`,
  });
}

// Create comment
const comment = await db.comment.create({
  data: {
    videoId: input.videoId,
    authorId: ctx.session.user.id,
    text: input.text,
    timecode: input.timecode,
    parentId: input.parentId,
  },
  include: {
    author: {
      select: { id: true, name: true, image: true },
    },
  },
});

// Update counts
await db.video.update({
  where: { id: input.videoId },
  data: { commentCount: { increment: 1 } },
});

if (input.parentId) {
  await db.comment.update({
    where: { id: input.parentId },
    data: { replyCount: { increment: 1 } },
  });
}
```

**Side Effects:**

- Comment created
- Video's `commentCount` incremented
- Parent comment's `replyCount` incremented (if reply)
- Notification sent to video uploader
- Notification sent to parent author (if reply)
- Notification sent to mentioned users (Post-Launch)

---

### 2. comment.getAll

**Status:** ✅ MVP

**Purpose:** Get all comments for a video (with replies)

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have view access to project

**Input Schema:**

```typescript
{
  videoId: z.string(),
  
  // Filtering
  resolved: z.boolean().optional(), // Filter by resolved status
  timecodeRange: z.object({
    start: z.number(),
    end: z.number(),
  }).optional(), // Comments within time range
  
  // Options
  includeReplies: z.boolean().default(true),
  
  // Pagination
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  comments: Array<Comment & {
    author: {
      id: string;
      name: string;
      image?: string;
    };
    replies?: Comment[]; // If includeReplies=true
  }>;
  nextCursor?: string;
  total: number;
}
```

**Example Request:**

```typescript
const { comments, total } = await trpc.comment.getAll.query({
  videoId: "507f1f77bcf86cd799439012",
  resolved: false, // Only unresolved comments
  includeReplies: true,
});
```

**Example Response:**

```json
{
  "comments": [
    {
      "id": "507f1f77bcf86cd799439030",
      "text": "The logo appears off-center",
      "timecode": 45.2,
      "resolved": false,
      "replyCount": 2,
      "createdAt": "2025-01-15T14:30:00Z",
      "author": {
        "id": "507f1f77bcf86cd799439011",
        "name": "John Doe"
      },
      "replies": [
        {
          "id": "507f1f77bcf86cd799439031",
          "text": "Good catch! I'll fix this.",
          "parentId": "507f1f77bcf86cd799439030",
          "createdAt": "2025-01-15T14:35:00Z",
          "author": {
            "id": "507f1f77bcf86cd799439012",
            "name": "Jane Smith"
          }
        }
      ]
    }
  ],
  "total": 15
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No access to project
- `NOT_FOUND` - Video does not exist

**Business Rules:**

1. Top-level comments sorted by timecode (ascending)
2. Replies sorted by createdAt (ascending - chronological)
3. Deleted comments excluded
4. includeReplies nests replies under parent

---

### 3. comment.getById

**Status:** ✅ MVP

**Purpose:** Get a single comment with full details

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have view access to project

**Input Schema:**

```typescript
{
  id: z.string(),
  includeReplies: z.boolean().default(true),
}
```

**Response Schema:**

```typescript
{
  comment: Comment & {
    author: { id: string; name: string; image?: string };
    replies?: Comment[];
    video: {
      id: string;
      title: string;
    };
  };
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No access to project
- `NOT_FOUND` - Comment does not exist

---

### 4. comment.reply

**Status:** ✅ MVP

**Purpose:** Reply to an existing comment (convenience wrapper for create)

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must have comment permission

**Input Schema:**

```typescript
{
  parentId: z.string(),
  text: z.string().min(1).max(5000).trim(),
}
```

**Response Schema:**

```typescript
{
  comment: Comment & {
    author: { id: string; name: string; image?: string };
    parent: {
      id: string;
      text: string;
      author: { id: string; name: string };
    };
  };
}
```

**Example Request:**

```typescript
const { comment } = await trpc.comment.reply.mutate({
  parentId: "507f1f77bcf86cd799439030",
  text: "Good catch! I'll adjust the logo position.",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No comment permission
- `NOT_FOUND` - Parent comment does not exist

**Note:** This is a convenience endpoint. Internally calls `comment.create` with parentId.

---

### 5. comment.update

**Status:** ✅ MVP

**Purpose:** Edit comment text

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be comment author

**Input Schema:**

```typescript
{
  id: z.string(),
  text: z.string().min(1).max(5000).trim(),
}
```

**Response Schema:**

```typescript
{
  comment: Comment;
}
```

**Example Request:**

```typescript
const { comment } = await trpc.comment.update.mutate({
  id: "507f1f77bcf86cd799439030",
  text: "The logo appears off-center. Please adjust to align with the grid.",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not comment author
- `NOT_FOUND` - Comment does not exist

**Business Rules:**

1. Only author can edit their own comments
2. Sets `edited = true`
3. Sets `editedAt` timestamp
4. Cannot edit resolved comments (must unresolve first - Post-Launch)
5. Cannot edit deleted comments

**Database Operations:**

```typescript
const comment = await db.comment.findUnique({
  where: { id: input.id },
});

if (comment.authorId !== ctx.session.user.id) {
  throw new TRPCError({ code: 'FORBIDDEN' });
}

const updated = await db.comment.update({
  where: { id: input.id },
  data: {
    text: input.text,
    edited: true,
    editedAt: new Date(),
  },
});
```

---

### 6. comment.delete

**Status:** ✅ MVP

**Purpose:** Delete a comment (soft delete)

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be comment author or project owner

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
await trpc.comment.delete.mutate({
  id: "507f1f77bcf86cd799439030",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not author or project owner
- `NOT_FOUND` - Comment does not exist

**Business Rules:**

1. Author or project owner can delete
2. Soft delete: Sets `deletedAt` timestamp
3. Hard delete after 30 days (background job)
4. Cascade: Replies also soft deleted
5. Decrements video's `commentCount`
6. Decrements parent's `replyCount` (if reply)

**Database Operations:**

```typescript
// Soft delete comment
await db.comment.update({
  where: { id: input.id },
  data: { deletedAt: new Date() },
});

// Soft delete all replies (cascade)
await db.comment.updateMany({
  where: { parentId: input.id },
  data: { deletedAt: new Date() },
});

// Update counts
await db.video.update({
  where: { id: comment.videoId },
  data: { commentCount: { decrement: 1 + comment.replyCount } },
});
```

**Side Effects:**

- Comment soft deleted
- All replies soft deleted (cascade)
- Video's `commentCount` decremented
- Parent's `replyCount` decremented (if reply)

---

### 7. comment.resolve

**Status:** ✅ MVP

**Purpose:** Mark a comment as resolved (feedback addressed)

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner, editor, or comment author

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Response Schema:**

```typescript
{
  comment: Comment & {
    resolvedByUser?: {
      id: string;
      name: string;
      image?: string;
    };
  };
}
```

**Example Request:**

```typescript
const { comment } = await trpc.comment.resolve.mutate({
  id: "507f1f77bcf86cd799439030",
});

console.log(comment.resolved); // true
console.log(comment.resolvedBy); // "507f1f77bcf86cd799439011"
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not owner/editor/author
- `NOT_FOUND` - Comment does not exist
- `CONFLICT` - Already resolved

**Business Rules:**

1. Owner, editor, or comment author can resolve
2. Sets `resolved = true`
3. Sets `resolvedAt` timestamp
4. Sets `resolvedBy` to current user ID
5. Resolving parent comment does NOT resolve replies
6. Notification sent to comment author (if not self)

**Use Cases:**

- Video editor marks feedback as "fixed"
- Reviewer confirms issue addressed
- Collaborate on iterative improvements

**Database Operations:**

```typescript
const comment = await db.comment.update({
  where: { id: input.id },
  data: {
    resolved: true,
    resolvedAt: new Date(),
    resolvedBy: ctx.session.user.id,
  },
  include: {
    resolvedByUser: {
      select: { id: true, name: true, image: true },
    },
  },
});
```

**Side Effects:**

- Comment marked as resolved
- Notification sent to author
- Resolved count updated (if project tracks stats)

---

## 🔮 Future Endpoints

### Post-Launch

#### comment.unresolve
**Priority:** High  
**Purpose:** Reopen a resolved comment  
**Why Later:** Resolve is priority, unresolve is edge case  
**Complexity:** Simple (inverse of resolve)

**Input:**
```typescript
{ id: z.string() }
```

---

#### comment.mention
**Priority:** High  
**Purpose:** @mention users in comments for notifications  
**Why Later:** Basic comments work without mentions, but improves collaboration  
**Complexity:** Medium (parsing mentions, notifications)

**Implementation:**
- Parse `@username` from comment text
- Validate mentioned users are project members
- Store in `mentions` array
- Send notifications to mentioned users

**Example:**
```typescript
await trpc.comment.create.mutate({
  text: "Hey @john, can you review the logo at this timestamp?",
  // Automatically parses and notifies user "john"
});
```

---

#### comment.search
**Priority:** Medium  
**Purpose:** Search comments by text, author, timecode range  
**Why Later:** Small comment counts don't need search  
**Complexity:** Medium (search indexing)

---

### Growth Phase

#### comment.bulkResolve
**Priority:** Medium  
**Purpose:** Resolve multiple comments at once  
**Why Later:** Power user feature  
**Complexity:** Simple (batch update)

---

#### comment.export
**Priority:** Medium  
**Purpose:** Export comments to PDF or CSV  
**Why Later:** Nice-to-have for reporting  
**Complexity:** Medium (PDF/CSV generation)

**Use Cases:**
- Share feedback report with stakeholders
- Archive comments for compliance
- Print feedback for offline review

---

#### comment.getThread
**Priority:** Low  
**Purpose:** Get full conversation thread for a comment  
**Why Later:** getAll with includeReplies covers most cases  
**Complexity:** Simple (recursive query)

---

### Scale Phase

#### comment.translate
**Priority:** Low  
**Purpose:** Translate comment to different language (AI)  
**Why Later:** English-only sufficient for MVP, AI integration complex  
**Complexity:** Complex (AI translation service)

---

#### comment.summarize
**Priority:** Low  
**Purpose:** AI-generated summary of all feedback  
**Why Later:** Advanced AI feature  
**Complexity:** Complex (AI summarization)

**Use Case:**
- Quickly understand all feedback without reading every comment
- Generate executive summary for stakeholders

---

## 🎯 Comment Threading

### Visual Structure

```
Comment 1 (timecode: 10.5s)
├─ Reply 1.1
├─ Reply 1.2
└─ Reply 1.3

Comment 2 (timecode: 45.2s) [RESOLVED]
└─ Reply 2.1

Comment 3 (timecode: 120.0s)
└─ Reply 3.1
   └─ Reply 3.1.1  ❌ NOT SUPPORTED (no nested replies)
```

**MVP Threading Rules:**
- **Single-level threading** only (parent → replies)
- **No nested replies** (replies to replies)
- Replies shown chronologically under parent
- Resolving parent does NOT resolve replies

**Future:** Multi-level threading (Growth phase)

---

## 🔔 Notifications

### When Notifications are Sent

| Event | Who Gets Notified |
|-------|-------------------|
| New comment on video | Video uploader |
| Reply to comment | Parent comment author |
| Mention in comment | Mentioned users |
| Comment resolved | Comment author |

**MVP:** Basic notifications  
**Post-Launch:** Email notifications, in-app notifications  
**Growth:** Real-time WebSocket notifications

---

## 🧪 Testing Scenarios

### MVP Testing
- [ ] Create comment on video
- [ ] Create comment with invalid timecode (exceeds duration)
- [ ] Reply to comment
- [ ] Edit own comment
- [ ] Edit other's comment (should fail)
- [ ] Delete own comment
- [ ] Delete as project owner
- [ ] Resolve comment as author
- [ ] Resolve comment as editor
- [ ] Resolve comment as viewer (should fail)
- [ ] Get all comments for video
- [ ] Get comments with replies
- [ ] Comments sorted by timecode
- [ ] Replies sorted by creation time

### Edge Cases
- [ ] Comment on deleted video (should fail)
- [ ] Reply to deleted comment (should fail)
- [ ] Delete comment with replies (cascade)
- [ ] Resolve already resolved comment
- [ ] Very long comment text (5000 chars)

---

## 📚 Related Documentation

- [Videos API](./04-videos) - Parent video
- [Projects API](./03-projects) - Permission system
- [Notifications API](./10-notifications) - Comment notifications *(Post-Launch)*
- [Users API](./02-users) - Comment authors

---

## 🔗 External Resources

- [Timecode Format Standards](https://www.w3.org/TR/media-frags/)
- [Threaded Comments UI Patterns](https://www.nngroup.com/articles/comment-threading/)
