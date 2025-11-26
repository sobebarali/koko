---
title: Notifications API
description: Real-time notifications and activity feed - Post-Launch Feature
---

# 🔔 Notifications API

## Overview

The Notifications domain provides a **real-time notification system** for keeping users informed about comments, mentions, project updates, video processing status, and team activities. Includes in-app notifications, email digests, and customizable preferences.

**Status:** 🔄 Post-Launch (Month 1-2)

---

## 📌 Quick Reference

### Post-Launch Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `notification.getAll` | Query | Yes | Get user notifications |
| `notification.getUnreadCount` | Query | Yes | Get unread count |
| `notification.markAsRead` | Mutation | Yes | Mark notification as read |
| `notification.markAllAsRead` | Mutation | Yes | Mark all as read |
| `notification.delete` | Mutation | Yes | Delete notification |
| `notification.updatePreferences` | Mutation | Yes | Update notification settings |
| `notification.getPreferences` | Query | Yes | Get notification preferences |

### Future Endpoints

#### Growth Phase (Month 3-6)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `notification.subscribe` | Subscription | Yes | WebSocket real-time updates | High |
| `notification.deleteAll` | Mutation | Yes | Clear all notifications | Medium |
| `notification.snooze` | Mutation | Yes | Snooze notification | Low |

#### Scale Phase (Month 6+)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `notification.sendDigest` | Mutation | No | Send email digest (cron) | High |
| `notification.getActivityFeed` | Query | Yes | Activity timeline | Medium |

---

## 📦 Data Models

### Notification

```typescript
interface Notification {
  id: string;                      // Notification ID
  userId: string;                  // Recipient user ID
  
  // Type & Content
  type: NotificationType;          // Event type (see below)
  title: string;                   // Notification title
  message: string;                 // Notification message
  
  // Resource Link
  resourceType?: "project" | "video" | "comment" | "team" | "subscription";
  resourceId?: string;             // Link to resource
  
  // Actor
  actorId?: string;                // User who triggered notification
  
  // Status
  read: boolean;                   // Has been read
  readAt?: DateTime;               // When marked as read
  
  // Email
  emailSent: boolean;              // Email sent
  emailSentAt?: DateTime;          // When email was sent
  
  // Timestamps
  createdAt: DateTime;
}
```

### NotificationType

```typescript
type NotificationType =
  // Comment Notifications
  | "comment_new"           // New comment on your video
  | "comment_reply"         // Reply to your comment
  | "comment_mention"       // You were mentioned in comment
  | "comment_resolved"      // Your comment was resolved
  
  // Video Notifications
  | "video_uploaded"        // Video upload complete
  | "video_ready"           // Video processing complete
  | "video_failed"          // Video processing failed
  
  // Project Notifications
  | "project_invite"        // Added to project
  | "project_role_changed"  // Your role changed
  
  // Team Notifications
  | "team_invite"           // Invited to team
  | "team_member_joined"    // New member joined team
  
  // Billing Notifications
  | "quota_warning"         // Approaching quota limit
  | "quota_exceeded"        // Quota exceeded
  | "subscription_renewed"  // Subscription renewed
  | "subscription_expiring" // Subscription expiring soon
  | "payment_failed";       // Payment failed
```

### NotificationPreference

```typescript
interface NotificationPreference {
  id: string;
  userId: string;
  
  // Email Preferences
  emailComments: boolean;          // Email for comments
  emailMentions: boolean;          // Email for mentions
  emailVideoReady: boolean;        // Email when video ready
  emailProjectInvites: boolean;    // Email for project invites
  emailDigest: "none" | "daily" | "weekly"; // Email digest frequency
  
  // In-App Preferences
  inAppComments: boolean;          // In-app comment notifications
  inAppMentions: boolean;          // In-app mention notifications
  inAppVideoReady: boolean;        // In-app video ready notifications
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Drizzle Schema

```typescript
// packages/db/src/schema/notification.ts

export const notification = sqliteTable(
  "notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        "comment_new",
        "comment_reply",
        "comment_mention",
        "comment_resolved",
        "video_uploaded",
        "video_ready",
        "video_failed",
        "project_invite",
        "project_role_changed",
        "team_invite",
        "team_member_joined",
        "quota_warning",
        "quota_exceeded",
        "subscription_renewed",
        "subscription_expiring",
        "payment_failed",
      ],
    }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    resourceType: text("resource_type", {
      enum: ["project", "video", "comment", "team", "subscription"],
    }),
    resourceId: text("resource_id"),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    read: integer("read", { mode: "boolean" }).default(false).notNull(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    emailSent: integer("email_sent", { mode: "boolean" })
      .default(false)
      .notNull(),
    emailSentAt: integer("email_sent_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("notification_user_idx").on(table.userId),
    index("notification_type_idx").on(table.type),
    index("notification_user_read_idx").on(table.userId, table.read),
    index("notification_created_idx").on(table.createdAt),
  ],
);

export const notificationPreference = sqliteTable(
  "notification_preference",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(),
    emailComments: integer("email_comments", { mode: "boolean" })
      .default(true)
      .notNull(),
    emailMentions: integer("email_mentions", { mode: "boolean" })
      .default(true)
      .notNull(),
    emailVideoReady: integer("email_video_ready", { mode: "boolean" })
      .default(true)
      .notNull(),
    emailProjectInvites: integer("email_project_invites", { mode: "boolean" })
      .default(true)
      .notNull(),
    emailDigest: text("email_digest", { enum: ["none", "daily", "weekly"] })
      .default("daily")
      .notNull(),
    inAppComments: integer("in_app_comments", { mode: "boolean" })
      .default(true)
      .notNull(),
    inAppMentions: integer("in_app_mentions", { mode: "boolean" })
      .default(true)
      .notNull(),
    inAppVideoReady: integer("in_app_video_ready", { mode: "boolean" })
      .default(true)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("notification_pref_user_idx").on(table.userId)],
);
```

---

## 🔄 Post-Launch Endpoints

### 1. notification.getAll

**Status:** 🔄 Post-Launch

**Purpose:** Get all notifications for the current user

**Type:** Query

**Auth Required:** Yes

**Permissions:** Any authenticated user (own notifications only)

**Input Schema:**

```typescript
{
  // Filtering
  read: z.boolean().optional(),    // Filter by read status
  type: z.enum([...NotificationType]).optional(), // Filter by type
  
  // Pagination
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  notifications: Array<Notification & {
    actor?: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  nextCursor?: string;
  total: number;
  unreadCount: number;
}
```

**Example Request:**

```typescript
const { notifications, unreadCount } = await trpc.notification.getAll.query({
  read: false, // Only unread
  limit: 20,
});
```

**Example Response:**

```json
{
  "notifications": [
    {
      "id": "notif_abc123",
      "userId": "user_xyz789",
      "type": "comment_new",
      "title": "New comment on your video",
      "message": "John Doe commented on \"Product Demo v2\"",
      "resourceType": "comment",
      "resourceId": "comment_def456",
      "actorId": "user_john123",
      "read": false,
      "emailSent": true,
      "createdAt": "2025-01-15T14:30:00Z",
      "actor": {
        "id": "user_john123",
        "name": "John Doe",
        "image": "https://cdn.koko.com/avatars/john.jpg"
      }
    },
    {
      "id": "notif_def456",
      "userId": "user_xyz789",
      "type": "video_ready",
      "title": "Video processing complete",
      "message": "Your video \"Tutorial Part 1\" is ready to view",
      "resourceType": "video",
      "resourceId": "video_ghi789",
      "read": false,
      "emailSent": false,
      "createdAt": "2025-01-15T13:00:00Z"
    }
  ],
  "total": 42,
  "unreadCount": 8
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in

**Business Rules:**

1. Users can only see their own notifications
2. Sorted by createdAt (newest first)
3. Deleted notifications excluded
4. Actor information included (name, image)
5. Unread count returned for badge display

**Database Operations:**

```typescript
// Build filters
const filters = [eq(notification.userId, ctx.session.user.id)];

if (input.read !== undefined) {
  filters.push(eq(notification.read, input.read));
}

if (input.type) {
  filters.push(eq(notification.type, input.type));
}

// Get notifications
const notifications = await db.query.notification.findMany({
  where: and(...filters),
  orderBy: [desc(notification.createdAt)],
  limit: input.limit + 1,
  with: {
    actor: {
      columns: { id: true, name: true, image: true },
    },
  },
});

// Get unread count
const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(notification)
  .where(and(
    eq(notification.userId, ctx.session.user.id),
    eq(notification.read, false)
  ));
```

---

### 2. notification.getUnreadCount

**Status:** 🔄 Post-Launch

**Purpose:** Get count of unread notifications (for badge)

**Type:** Query

**Auth Required:** Yes

**Permissions:** Any authenticated user

**Input Schema:**

```typescript
{}
```

**Response Schema:**

```typescript
{
  count: number;
}
```

**Example Request:**

```typescript
const { count } = await trpc.notification.getUnreadCount.query();
// Returns: { count: 8 }
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in

**Business Rules:**

1. Fast query for notification badge
2. Cached for 30 seconds (Growth phase)

**Database Operations:**

```typescript
const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(notification)
  .where(and(
    eq(notification.userId, ctx.session.user.id),
    eq(notification.read, false)
  ));

return { count };
```

---

### 3. notification.markAsRead

**Status:** 🔄 Post-Launch

**Purpose:** Mark a single notification as read

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be notification owner

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Response Schema:**

```typescript
{
  notification: Notification;
}
```

**Example Request:**

```typescript
const { notification } = await trpc.notification.markAsRead.mutate({
  id: "notif_abc123",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not your notification
- `NOT_FOUND` - Notification does not exist

**Business Rules:**

1. Only notification owner can mark as read
2. Sets `read = true`
3. Sets `readAt` timestamp
4. Idempotent: Already read is OK

**Database Operations:**

```typescript
// Verify ownership
const notif = await db.query.notification.findFirst({
  where: eq(notification.id, input.id),
});

if (notif.userId !== ctx.session.user.id) {
  throw new TRPCError({ code: "FORBIDDEN" });
}

// Mark as read
const [updated] = await db.update(notification)
  .set({
    read: true,
    readAt: new Date(),
  })
  .where(eq(notification.id, input.id))
  .returning();
```

---

### 4. notification.markAllAsRead

**Status:** 🔄 Post-Launch

**Purpose:** Mark all user's notifications as read

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Any authenticated user

**Input Schema:**

```typescript
{
  type: z.enum([...NotificationType]).optional(), // Mark specific type only
}
```

**Response Schema:**

```typescript
{
  count: number; // Number marked as read
}
```

**Example Request:**

```typescript
const { count } = await trpc.notification.markAllAsRead.mutate({
  type: "comment_new", // Only comment notifications
});

// Or mark ALL as read:
const { count } = await trpc.notification.markAllAsRead.mutate({});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in

**Business Rules:**

1. Marks all unread notifications as read
2. Can filter by notification type
3. Returns count of updated notifications

**Database Operations:**

```typescript
const filters = [
  eq(notification.userId, ctx.session.user.id),
  eq(notification.read, false),
];

if (input.type) {
  filters.push(eq(notification.type, input.type));
}

// Mark all as read
const result = await db.update(notification)
  .set({
    read: true,
    readAt: new Date(),
  })
  .where(and(...filters));

return { count: result.rowsAffected };
```

---

### 5. notification.delete

**Status:** 🔄 Post-Launch

**Purpose:** Delete a single notification

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be notification owner

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
await trpc.notification.delete.mutate({
  id: "notif_abc123",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not your notification
- `NOT_FOUND` - Notification does not exist

**Business Rules:**

1. Only notification owner can delete
2. Hard delete (permanent)
3. Cannot be undone

**Database Operations:**

```typescript
// Verify ownership
const notif = await db.query.notification.findFirst({
  where: eq(notification.id, input.id),
});

if (notif.userId !== ctx.session.user.id) {
  throw new TRPCError({ code: "FORBIDDEN" });
}

// Delete notification
await db.delete(notification)
  .where(eq(notification.id, input.id));

return { success: true };
```

---

### 6. notification.updatePreferences

**Status:** 🔄 Post-Launch

**Purpose:** Update notification preferences

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Any authenticated user (own preferences)

**Input Schema:**

```typescript
{
  emailComments: z.boolean().optional(),
  emailMentions: z.boolean().optional(),
  emailVideoReady: z.boolean().optional(),
  emailProjectInvites: z.boolean().optional(),
  emailDigest: z.enum(["none", "daily", "weekly"]).optional(),
  inAppComments: z.boolean().optional(),
  inAppMentions: z.boolean().optional(),
  inAppVideoReady: z.boolean().optional(),
}
```

**Response Schema:**

```typescript
{
  preferences: NotificationPreference;
}
```

**Example Request:**

```typescript
const { preferences } = await trpc.notification.updatePreferences.mutate({
  emailComments: false,      // Disable email for comments
  emailDigest: "weekly",     // Weekly digest instead of daily
  inAppComments: true,       // Keep in-app notifications
});
```

**Example Response:**

```json
{
  "preferences": {
    "id": "pref_abc123",
    "userId": "user_xyz789",
    "emailComments": false,
    "emailMentions": true,
    "emailVideoReady": true,
    "emailProjectInvites": true,
    "emailDigest": "weekly",
    "inAppComments": true,
    "inAppMentions": true,
    "inAppVideoReady": true,
    "updatedAt": "2025-01-15T14:30:00Z"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in

**Business Rules:**

1. Creates preferences on first access (if not exist)
2. Updates only provided fields
3. At least one field must be provided

**Database Operations:**

```typescript
// Upsert preferences
const [preferences] = await db.insert(notificationPreference)
  .values({
    id: generateId(),
    userId: ctx.session.user.id,
    ...input,
  })
  .onConflictDoUpdate({
    target: notificationPreference.userId,
    set: {
      ...input,
      updatedAt: new Date(),
    },
  })
  .returning();

return { preferences };
```

---

### 7. notification.getPreferences

**Status:** 🔄 Post-Launch

**Purpose:** Get current notification preferences

**Type:** Query

**Auth Required:** Yes

**Permissions:** Any authenticated user (own preferences)

**Input Schema:**

```typescript
{}
```

**Response Schema:**

```typescript
{
  preferences: NotificationPreference;
}
```

**Example Request:**

```typescript
const { preferences } = await trpc.notification.getPreferences.query();
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in

**Business Rules:**

1. Returns default preferences if none exist
2. Auto-creates record with defaults on first access

**Database Operations:**

```typescript
// Get or create preferences
let preferences = await db.query.notificationPreference.findFirst({
  where: eq(notificationPreference.userId, ctx.session.user.id),
});

if (!preferences) {
  // Create with defaults
  [preferences] = await db.insert(notificationPreference)
    .values({
      id: generateId(),
      userId: ctx.session.user.id,
      // Defaults from schema
    })
    .returning();
}

return { preferences };
```

---

## 🔮 Future Endpoints

### Growth Phase

#### notification.subscribe
**Priority:** High  
**Purpose:** WebSocket subscription for real-time notifications  
**Why Later:** MVP uses polling, real-time enhances UX  
**Complexity:** Complex (WebSocket infrastructure)

**Implementation:**
```typescript
// Client subscribes
const unsubscribe = trpc.notification.subscribe.subscribe(undefined, {
  onData: (notification) => {
    showToast(notification);
    playSound();
  },
});

// Server broadcasts
ctx.ee.emit("notification", { userId, notification });
```

---

#### notification.deleteAll
**Priority:** Medium  
**Purpose:** Clear all notifications (or by type)  
**Why Later:** Nice-to-have for inbox zero users  
**Complexity:** Simple (batch delete)

**Example:**
```typescript
await trpc.notification.deleteAll.mutate({
  type: "comment_new", // Optional: delete only comment notifications
});
```

---

#### notification.snooze
**Priority:** Low  
**Purpose:** Temporarily hide notification, re-appear later  
**Why Later:** Advanced feature for power users  
**Complexity:** Medium (scheduling system)

**Example:**
```typescript
await trpc.notification.snooze.mutate({
  id: "notif_abc123",
  until: "2025-01-16T09:00:00Z", // Re-appear tomorrow 9am
});
```

---

### Scale Phase

#### notification.sendDigest
**Priority:** High  
**Purpose:** Cron job to send email digests (daily/weekly)  
**Why Later:** Email infrastructure needed first  
**Complexity:** Complex (email templating, scheduling)

**Implementation:**
- Background job runs daily/weekly
- Groups unread notifications by user
- Sends templated HTML email
- Marks notifications as `emailSent=true`

---

#### notification.getActivityFeed
**Priority:** Medium  
**Purpose:** Get chronological activity timeline (all events)  
**Why Later:** Different from notifications (includes all activity)  
**Complexity:** Medium (separate activity tracking)

**Example:**
```typescript
const { activities } = await trpc.notification.getActivityFeed.query({
  projectId: "proj_abc123", // Optional: project-specific
  limit: 50,
});

// Returns: "John uploaded video", "Jane commented", etc.
```

---

## 📬 Notification Creation

### How Notifications are Created

Notifications are created automatically by backend event handlers:

```typescript
// Example: Comment created
async function createCommentNotification({
  videoId,
  commentId,
  authorId,
  videoOwnerId,
}: {
  videoId: string;
  commentId: string;
  authorId: string;
  videoOwnerId: string;
}) {
  // Don't notify self
  if (authorId === videoOwnerId) return;

  // Check user preferences
  const prefs = await getUserPreferences(videoOwnerId);
  if (!prefs.inAppComments && !prefs.emailComments) return;

  // Create notification
  const [notification] = await db.insert(notification).values({
    id: generateId(),
    userId: videoOwnerId,
    type: "comment_new",
    title: "New comment on your video",
    message: `${authorName} commented on "${videoTitle}"`,
    resourceType: "comment",
    resourceId: commentId,
    actorId: authorId,
    read: false,
    emailSent: false,
  }).returning();

  // Send email if enabled
  if (prefs.emailComments) {
    await sendCommentEmail({
      to: videoOwnerEmail,
      notification,
    });
    
    // Mark email sent
    await db.update(notification)
      .set({ emailSent: true, emailSentAt: new Date() })
      .where(eq(notification.id, notification.id));
  }

  // Real-time push (Growth phase)
  ctx.ee.emit("notification", { userId: videoOwnerId, notification });
}
```

### Notification Triggers

| Event | Notification Type | Recipient |
|-------|-------------------|-----------|
| Comment created | `comment_new` | Video owner |
| Comment reply | `comment_reply` | Parent comment author |
| @mention in comment | `comment_mention` | Mentioned user |
| Comment resolved | `comment_resolved` | Comment author |
| Video upload complete | `video_uploaded` | Video uploader |
| Video processing done | `video_ready` | Video uploader |
| Video processing failed | `video_failed` | Video uploader |
| Added to project | `project_invite` | New member |
| Project role changed | `project_role_changed` | Affected user |
| Added to team | `team_invite` | New member |
| Team member joined | `team_member_joined` | Team admins |
| 80% quota used | `quota_warning` | Account owner |
| Quota exceeded | `quota_exceeded` | Account owner |
| Subscription renewed | `subscription_renewed` | Account owner |
| Subscription expires in 7 days | `subscription_expiring` | Account owner |
| Payment failed | `payment_failed` | Account owner |

---

## 📧 Email Delivery

### Email Preferences

Users can control email delivery per notification type:

```typescript
interface EmailPreferences {
  emailComments: boolean;          // Comment notifications
  emailMentions: boolean;          // @mentions
  emailVideoReady: boolean;        // Video processing complete
  emailProjectInvites: boolean;    // Project invitations
  emailDigest: "none" | "daily" | "weekly"; // Digest frequency
}
```

### Immediate Emails

These are sent immediately:
- `comment_mention` - Mentions are urgent
- `project_invite` - Invitations require action
- `video_failed` - Errors need attention
- `payment_failed` - Billing issues are critical

### Digest Emails

These are batched into digests:
- `comment_new` - New comments
- `comment_reply` - Comment replies
- `video_ready` - Video processing complete
- `team_member_joined` - Team activity

### Email Templates

```
Subject: [Koko] New comment on "Product Demo v2"

Hi John,

Jane Smith commented on your video "Product Demo v2" at 00:45:

"The logo appears off-center at this timestamp. Can we adjust it?"

[View Comment] [Reply]

---
Notification preferences: https://koko.com/settings/notifications
```

---

## 🧪 Testing Scenarios

### Post-Launch Testing
- [ ] Get all notifications for user
- [ ] Get unread count
- [ ] Filter notifications by type
- [ ] Filter notifications by read status
- [ ] Mark notification as read
- [ ] Mark all notifications as read
- [ ] Delete notification
- [ ] Delete other user's notification (should fail)
- [ ] Update notification preferences
- [ ] Get notification preferences (creates defaults)
- [ ] Email sent when preference enabled
- [ ] Email NOT sent when preference disabled
- [ ] Pagination with cursor

### Edge Cases
- [ ] Notification for deleted resource
- [ ] Notification from deleted user (actor)
- [ ] Mark already read notification as read (idempotent)
- [ ] Update preferences with no fields (should fail)
- [ ] Very long notification messages (truncation)
- [ ] Multiple notifications from same actor (grouping - Growth phase)
- [ ] Email delivery failure (retry logic - Scale phase)

---

## 🔔 Notification Grouping (Growth Phase)

### Problem
Too many similar notifications create noise:
- "John commented"
- "Jane commented"
- "Bob commented"

### Solution
Group related notifications:
- "John, Jane, and Bob commented on your video"

### Implementation
```typescript
interface GroupedNotification {
  type: NotificationType;
  resourceType: string;
  resourceId: string;
  actors: Array<{ id: string; name: string; image?: string }>;
  count: number;           // Total notifications in group
  lastCreatedAt: DateTime; // Most recent
}
```

---

## 📚 Related Documentation

- [Comments API](./05-comments) - Comment notifications
- [Videos API](./04-videos) - Video processing notifications
- [Projects API](./03-projects) - Project invite notifications
- [Teams API](./08-teams) - Team notifications *(Growth Phase)*
- [Webhooks API](./12-webhooks) - Webhook notifications *(Scale Phase)*
- [Billing API](./13-billing) - Payment notifications

---

## 🔗 External Resources

- [Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Email Best Practices](https://www.campaignmonitor.com/resources/guides/email-marketing-best-practices/)
- [Notification Design Patterns](https://www.nngroup.com/articles/push-notification/)
- [WebSocket Real-Time Patterns](https://socket.io/docs/v4/)
