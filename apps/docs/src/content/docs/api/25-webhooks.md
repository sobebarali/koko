---
title: Webhooks API
description: Event-driven integrations and automation - Scale Phase Feature
---

# 🔗 Webhooks API

## Overview

The Webhooks domain enables **real-time integrations** with external services by sending HTTP callbacks when events occur in Koko. Supports event subscriptions, delivery tracking, retry logic, and security features like HMAC signatures.

**Status:** ⚡ Scale Phase (Month 6+)

---

## 📌 Quick Reference

### Scale Phase Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `webhook.create` | Mutation | Yes | Create webhook endpoint |
| `webhook.getById` | Query | Yes | Get webhook details |
| `webhook.getAll` | Query | Yes | List all webhooks |
| `webhook.update` | Mutation | Yes | Update webhook settings |
| `webhook.delete` | Mutation | Yes | Delete webhook |
| `webhook.test` | Mutation | Yes | Send test payload |
| `webhook.getDeliveries` | Query | Yes | Get delivery history |
| `webhook.redeliver` | Mutation | Yes | Retry failed delivery |

### Future Endpoints

#### Enterprise Phase (Month 12+)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `webhook.rotateSecret` | Mutation | Yes | Rotate webhook secret | High |
| `webhook.updateIpWhitelist` | Mutation | Yes | Update IP whitelist | Medium |
| `webhook.getStats` | Query | Yes | Get webhook statistics | Low |

---

## 📦 Data Models

### Webhook

```typescript
interface Webhook {
  id: string;                      // Webhook ID
  userId: string;                  // Owner user ID
  teamId?: string;                 // Team (if team webhook)
  
  // Configuration
  name: string;                    // Display name
  url: string;                     // Webhook endpoint URL
  secret: string;                  // Signing secret (HMAC)
  events: string[];                // Subscribed events
  
  // Status
  isActive: boolean;               // Enabled/disabled
  lastTriggeredAt?: DateTime;      // Last successful delivery
  successCount: number;            // Total successful deliveries
  failureCount: number;            // Total failed deliveries
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### WebhookDelivery

```typescript
interface WebhookDelivery {
  id: string;                      // Delivery ID
  webhookId: string;               // Parent webhook
  
  // Event
  event: string;                   // Event type
  payload: Record<string, unknown>; // Event data
  
  // Delivery Status
  status: "pending" | "success" | "failed";
  statusCode?: number;             // HTTP status code
  responseBody?: string;           // Response from endpoint
  errorMessage?: string;           // Error details
  
  // Retry
  attempts: number;                // Delivery attempts
  nextRetryAt?: DateTime;          // Next retry time
  deliveredAt?: DateTime;          // When delivered
  
  // Timestamps
  createdAt: DateTime;
}
```

### Drizzle Schema

```typescript
// packages/db/src/schema/webhook.ts

export const webhook = sqliteTable(
  "webhook",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: text("events", { mode: "json" }).$type<string[]>().notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    lastTriggeredAt: integer("last_triggered_at", { mode: "timestamp_ms" }),
    successCount: integer("success_count").default(0).notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("webhook_user_idx").on(table.userId),
    index("webhook_team_idx").on(table.teamId),
  ],
);

export const webhookDelivery = sqliteTable(
  "webhook_delivery",
  {
    id: text("id").primaryKey(),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhook.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    payload: text("payload", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    status: text("status", { enum: ["pending", "success", "failed"] })
      .default("pending")
      .notNull(),
    statusCode: integer("status_code"),
    responseBody: text("response_body"),
    errorMessage: text("error_message"),
    attempts: integer("attempts").default(0).notNull(),
    nextRetryAt: integer("next_retry_at", { mode: "timestamp_ms" }),
    deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("webhook_delivery_webhook_idx").on(table.webhookId),
    index("webhook_delivery_status_idx").on(table.status),
    index("webhook_delivery_retry_idx").on(table.nextRetryAt),
  ],
);
```

---

## ⚡ Scale Phase Endpoints

### 1. webhook.create

**Status:** ⚡ Scale Phase

**Purpose:** Create a new webhook endpoint

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Any authenticated user (team webhooks require team admin)

**Input Schema:**

```typescript
{
  name: z.string().min(1).max(100).trim(),
  url: z.string().url().startsWith("https://"), // HTTPS only
  events: z.array(z.string()).min(1).max(50),   // Event subscriptions
  teamId: z.string().optional(),                // Team webhook
}
```

**Response Schema:**

```typescript
{
  webhook: Webhook;
}
```

**Example Request:**

```typescript
const { webhook } = await trpc.webhook.create.mutate({
  name: "Slack Notifications",
  url: "https://hooks.slack.com/services/T00/B00/xxx",
  events: [
    "video.ready",
    "video.failed",
    "comment.created",
  ],
});
```

**Example Response:**

```json
{
  "webhook": {
    "id": "wh_abc123",
    "userId": "user_xyz789",
    "name": "Slack Notifications",
    "url": "https://hooks.slack.com/services/T00/B00/xxx",
    "secret": "whsec_abc123def456ghi789jkl012mno345pqr678stu901",
    "events": ["video.ready", "video.failed", "comment.created"],
    "isActive": true,
    "successCount": 0,
    "failureCount": 0,
    "createdAt": "2025-01-15T14:30:00Z"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not team admin (for team webhooks)
- `BAD_REQUEST` - Invalid URL, non-HTTPS, or unsupported events

**Business Rules:**

1. Only HTTPS URLs allowed (security)
2. Secret auto-generated (64-char random string)
3. Must subscribe to at least one event
4. Webhook starts active by default
5. Team webhooks require team admin permission
6. Secret shown only once (on creation)

**Database Operations:**

```typescript
// Generate secret
const secret = generateWebhookSecret(); // 64-char random

// Validate events
const validEvents = getAllWebhookEvents();
const invalidEvents = input.events.filter(e => !validEvents.includes(e));
if (invalidEvents.length > 0) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `Invalid events: ${invalidEvents.join(", ")}`,
  });
}

// Create webhook
const [webhook] = await db.insert(webhook).values({
  id: generateId(),
  userId: ctx.session.user.id,
  teamId: input.teamId,
  name: input.name,
  url: input.url,
  secret,
  events: input.events,
  isActive: true,
  successCount: 0,
  failureCount: 0,
}).returning();
```

**Side Effects:**

- Webhook created
- Test delivery can be sent immediately (optional)

---

### 2. webhook.getById

**Status:** ⚡ Scale Phase

**Purpose:** Get webhook details

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be webhook owner or team member

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Response Schema:**

```typescript
{
  webhook: Webhook & {
    recentDeliveries: WebhookDelivery[]; // Last 10
  };
}
```

**Example Request:**

```typescript
const { webhook } = await trpc.webhook.getById.query({
  id: "wh_abc123",
});
```

**Example Response:**

```json
{
  "webhook": {
    "id": "wh_abc123",
    "name": "Slack Notifications",
    "url": "https://hooks.slack.com/services/T00/B00/xxx",
    "secret": "whsec_***masked***",
    "events": ["video.ready", "video.failed"],
    "isActive": true,
    "lastTriggeredAt": "2025-01-15T14:00:00Z",
    "successCount": 142,
    "failureCount": 3,
    "recentDeliveries": [
      {
        "id": "del_xyz789",
        "event": "video.ready",
        "status": "success",
        "statusCode": 200,
        "attempts": 1,
        "deliveredAt": "2025-01-15T14:00:00Z"
      }
    ]
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not webhook owner
- `NOT_FOUND` - Webhook does not exist

**Business Rules:**

1. Secret is masked (shows only last 4 chars)
2. Includes last 10 deliveries
3. Full secret only shown on creation

---

### 3. webhook.getAll

**Status:** ⚡ Scale Phase

**Purpose:** List all user's or team's webhooks

**Type:** Query

**Auth Required:** Yes

**Permissions:** Any authenticated user (own webhooks) or team member

**Input Schema:**

```typescript
{
  teamId: z.string().optional(), // Filter by team
  isActive: z.boolean().optional(), // Filter by status
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  webhooks: Webhook[];
  nextCursor?: string;
  total: number;
}
```

**Example Request:**

```typescript
const { webhooks, total } = await trpc.webhook.getAll.query({
  isActive: true, // Only active webhooks
});
```

**Example Response:**

```json
{
  "webhooks": [
    {
      "id": "wh_abc123",
      "name": "Slack Notifications",
      "url": "https://hooks.slack.com/...",
      "events": ["video.ready", "video.failed"],
      "isActive": true,
      "successCount": 142,
      "failureCount": 3,
      "lastTriggeredAt": "2025-01-15T14:00:00Z"
    }
  ],
  "total": 3
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in

**Business Rules:**

1. Returns user's personal webhooks
2. If `teamId` provided, returns team webhooks (requires team membership)
3. Secrets always masked in list view
4. Sorted by createdAt (newest first)

---

### 4. webhook.update

**Status:** ⚡ Scale Phase

**Purpose:** Update webhook settings

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be webhook owner or team admin

**Input Schema:**

```typescript
{
  id: z.string(),
  name: z.string().min(1).max(100).trim().optional(),
  url: z.string().url().startsWith("https://").optional(),
  events: z.array(z.string()).min(1).max(50).optional(),
  isActive: z.boolean().optional(),
}
```

**Response Schema:**

```typescript
{
  webhook: Webhook;
}
```

**Example Request:**

```typescript
const { webhook } = await trpc.webhook.update.mutate({
  id: "wh_abc123",
  events: ["video.ready", "video.failed", "comment.created"], // Add event
  isActive: true, // Re-enable
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not webhook owner
- `NOT_FOUND` - Webhook does not exist
- `BAD_REQUEST` - Invalid events or URL

**Business Rules:**

1. Only owner or team admin can update
2. At least one field must be provided
3. Secret cannot be changed (use rotateSecret endpoint)
4. `updatedAt` timestamp updated

**Database Operations:**

```typescript
// Validate events if provided
if (input.events) {
  const validEvents = getAllWebhookEvents();
  const invalidEvents = input.events.filter(e => !validEvents.includes(e));
  if (invalidEvents.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid events: ${invalidEvents.join(", ")}`,
    });
  }
}

// Update webhook
const [updated] = await db.update(webhook)
  .set({
    name: input.name,
    url: input.url,
    events: input.events,
    isActive: input.isActive,
    updatedAt: new Date(),
  })
  .where(eq(webhook.id, input.id))
  .returning();
```

---

### 5. webhook.delete

**Status:** ⚡ Scale Phase

**Purpose:** Delete a webhook

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be webhook owner or team admin

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
await trpc.webhook.delete.mutate({
  id: "wh_abc123",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not webhook owner
- `NOT_FOUND` - Webhook does not exist

**Business Rules:**

1. Only owner or team admin can delete
2. Hard delete (permanent)
3. All delivery history also deleted (cascade)
4. Cannot be undone

**Database Operations:**

```typescript
// Delete webhook (cascade to deliveries)
await db.delete(webhook)
  .where(eq(webhook.id, input.id));

// Deliveries auto-deleted due to cascade
```

---

### 6. webhook.test

**Status:** ⚡ Scale Phase

**Purpose:** Send a test payload to webhook endpoint

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be webhook owner or team admin

**Input Schema:**

```typescript
{
  id: z.string(),
  event: z.string().optional(), // Default: "webhook.test"
}
```

**Response Schema:**

```typescript
{
  delivery: WebhookDelivery;
}
```

**Example Request:**

```typescript
const { delivery } = await trpc.webhook.test.mutate({
  id: "wh_abc123",
  event: "video.ready", // Optional: test specific event
});
```

**Example Response:**

```json
{
  "delivery": {
    "id": "del_test123",
    "webhookId": "wh_abc123",
    "event": "webhook.test",
    "status": "success",
    "statusCode": 200,
    "responseBody": "ok",
    "attempts": 1,
    "deliveredAt": "2025-01-15T14:30:00Z",
    "payload": {
      "event": "webhook.test",
      "timestamp": "2025-01-15T14:30:00Z",
      "data": {
        "message": "This is a test webhook"
      }
    }
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not webhook owner
- `NOT_FOUND` - Webhook does not exist

**Business Rules:**

1. Sends test payload immediately
2. Does not count toward success/failure stats
3. Uses real signing secret
4. Delivery is recorded in history

**Payload Example:**

```json
{
  "event": "webhook.test",
  "timestamp": "2025-01-15T14:30:00Z",
  "webhookId": "wh_abc123",
  "data": {
    "message": "This is a test webhook from Koko"
  }
}
```

---

### 7. webhook.getDeliveries

**Status:** ⚡ Scale Phase

**Purpose:** Get webhook delivery history

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be webhook owner or team member

**Input Schema:**

```typescript
{
  webhookId: z.string(),
  status: z.enum(["pending", "success", "failed"]).optional(),
  event: z.string().optional(), // Filter by event type
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  deliveries: WebhookDelivery[];
  nextCursor?: string;
  total: number;
  stats: {
    successCount: number;
    failureCount: number;
    pendingCount: number;
  };
}
```

**Example Request:**

```typescript
const { deliveries, stats } = await trpc.webhook.getDeliveries.query({
  webhookId: "wh_abc123",
  status: "failed", // Only failed deliveries
});
```

**Example Response:**

```json
{
  "deliveries": [
    {
      "id": "del_fail123",
      "webhookId": "wh_abc123",
      "event": "video.ready",
      "status": "failed",
      "statusCode": 500,
      "errorMessage": "Internal Server Error",
      "responseBody": "Service unavailable",
      "attempts": 3,
      "nextRetryAt": "2025-01-15T15:00:00Z",
      "createdAt": "2025-01-15T14:00:00Z",
      "payload": {
        "event": "video.ready",
        "data": { "videoId": "video_123" }
      }
    }
  ],
  "stats": {
    "successCount": 142,
    "failureCount": 3,
    "pendingCount": 1
  },
  "total": 146
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not webhook owner
- `NOT_FOUND` - Webhook does not exist

**Business Rules:**

1. Sorted by createdAt (newest first)
2. Includes full payload and response
3. Shows retry schedule for failed deliveries
4. Deliveries older than 30 days auto-deleted

---

### 8. webhook.redeliver

**Status:** ⚡ Scale Phase

**Purpose:** Retry a failed webhook delivery

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be webhook owner or team admin

**Input Schema:**

```typescript
{
  deliveryId: z.string(),
}
```

**Response Schema:**

```typescript
{
  delivery: WebhookDelivery;
}
```

**Example Request:**

```typescript
const { delivery } = await trpc.webhook.redeliver.mutate({
  deliveryId: "del_fail123",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not webhook owner
- `NOT_FOUND` - Delivery does not exist
- `CONFLICT` - Delivery already succeeded

**Business Rules:**

1. Only failed deliveries can be redelivered
2. Increments attempt count
3. Uses same payload as original
4. Resets status to "pending"
5. Delivery attempted immediately

**Database Operations:**

```typescript
// Check delivery status
const delivery = await db.query.webhookDelivery.findFirst({
  where: eq(webhookDelivery.id, input.deliveryId),
});

if (delivery.status === "success") {
  throw new TRPCError({
    code: "CONFLICT",
    message: "Cannot redeliver successful delivery",
  });
}

// Reset and retry
await db.update(webhookDelivery)
  .set({
    status: "pending",
    nextRetryAt: new Date(),
    attempts: sql`${webhookDelivery.attempts} + 1`,
  })
  .where(eq(webhookDelivery.id, input.deliveryId));

// Queue for immediate delivery
await queueWebhookDelivery(delivery);
```

---

## 🔮 Future Endpoints

### Enterprise Phase

#### webhook.rotateSecret
**Priority:** High  
**Purpose:** Rotate webhook signing secret  
**Why Later:** Security feature for enterprise  
**Complexity:** Medium (secret rotation, grace period)

**Implementation:**
- Generate new secret
- Keep old secret valid for 24 hours (grace period)
- Return new secret (shown once)
- Notify user to update integrations

---

#### webhook.updateIpWhitelist
**Priority:** Medium  
**Purpose:** Restrict webhook to specific IP addresses  
**Why Later:** Enterprise security requirement  
**Complexity:** Medium (IP validation, CIDR ranges)

**Example:**
```typescript
await trpc.webhook.updateIpWhitelist.mutate({
  id: "wh_abc123",
  ipWhitelist: ["192.168.1.0/24", "10.0.0.5"],
});
```

---

#### webhook.getStats
**Priority:** Low  
**Purpose:** Get detailed webhook statistics  
**Why Later:** Analytics feature for power users  
**Complexity:** Medium (time-series data)

**Returns:**
- Success rate over time
- Average response time
- Event distribution
- Failure reasons breakdown

---

## 📡 Webhook Events

### Video Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `video.uploaded` | Video upload complete | `{ videoId, projectId, uploadedBy }` |
| `video.processing` | Processing started | `{ videoId, status: "processing" }` |
| `video.ready` | Processing complete | `{ videoId, duration, playbackUrl }` |
| `video.failed` | Processing failed | `{ videoId, error }` |
| `video.deleted` | Video deleted | `{ videoId, projectId }` |

### Comment Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `comment.created` | New comment | `{ commentId, videoId, timecode, authorId }` |
| `comment.updated` | Comment edited | `{ commentId, text }` |
| `comment.deleted` | Comment deleted | `{ commentId, videoId }` |
| `comment.resolved` | Comment resolved | `{ commentId, resolvedBy }` |
| `comment.reply` | Reply created | `{ commentId, parentId, authorId }` |

### Project Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `project.created` | New project | `{ projectId, name, ownerId }` |
| `project.updated` | Project settings changed | `{ projectId, changes }` |
| `project.deleted` | Project deleted | `{ projectId, ownerId }` |
| `project.member_added` | Member added | `{ projectId, userId, role }` |
| `project.member_removed` | Member removed | `{ projectId, userId }` |

### Team Events (Growth Phase)

| Event | Trigger | Payload |
|-------|---------|---------|
| `team.created` | New team | `{ teamId, name, ownerId }` |
| `team.member_joined` | Member joined | `{ teamId, userId, role }` |
| `team.member_left` | Member left | `{ teamId, userId }` |

### Billing Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `subscription.created` | Subscription started | `{ subscriptionId, userId, plan }` |
| `subscription.renewed` | Subscription renewed | `{ subscriptionId, nextBillingDate }` |
| `subscription.canceled` | Subscription canceled | `{ subscriptionId, canceledAt }` |
| `payment.succeeded` | Payment successful | `{ paymentId, amount }` |
| `payment.failed` | Payment failed | `{ paymentId, error }` |

---

## 🔐 Security

### HMAC Signature Verification

Every webhook payload includes an HMAC-SHA256 signature for verification:

**Header:**
```
X-Koko-Signature: sha256=abc123...
X-Koko-Timestamp: 1705329000
```

**Verification (Recipient):**
```typescript
import crypto from "crypto";

function verifyWebhookSignature({
  payload,
  signature,
  timestamp,
  secret,
}: {
  payload: string;
  signature: string;
  timestamp: string;
  secret: string;
}) {
  // Check timestamp (prevent replay attacks)
  const now = Date.now() / 1000;
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    throw new Error("Timestamp too old");
  }
  
  // Compute signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  
  // Compare signatures (constant-time)
  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  )) {
    throw new Error("Invalid signature");
  }
  
  return true;
}
```

### Best Practices

1. **Always verify signatures** - Never trust payload without verification
2. **Check timestamp** - Reject old requests (> 5 minutes)
3. **Use HTTPS only** - Never send webhooks over HTTP
4. **Rotate secrets regularly** - Use `rotateSecret` endpoint
5. **Rate limiting** - Implement rate limiting on your endpoint
6. **Idempotency** - Handle duplicate deliveries gracefully

---

## 🔄 Retry Logic

### Automatic Retries

Failed deliveries are retried with exponential backoff:

| Attempt | Delay | Total Time |
|---------|-------|------------|
| 1 | Immediate | 0s |
| 2 | 1 minute | 1m |
| 3 | 5 minutes | 6m |
| 4 | 15 minutes | 21m |
| 5 | 1 hour | 1h 21m |
| 6 | 6 hours | 7h 21m |
| 7 | 24 hours | 31h 21m |

**After 7 attempts:** Delivery marked as permanently failed

### Failure Conditions

| Status Code | Retry? | Reason |
|-------------|--------|--------|
| 200-299 | ✅ Success | Delivery successful |
| 300-399 | ❌ No retry | Redirect not supported |
| 400-499 | ❌ No retry | Client error (invalid payload) |
| 500-599 | ✅ Retry | Server error (temporary) |
| Timeout | ✅ Retry | Network timeout (30s) |
| DNS Error | ✅ Retry | DNS resolution failed |

---

## 📊 Payload Format

### Standard Structure

```json
{
  "event": "video.ready",
  "timestamp": "2025-01-15T14:30:00Z",
  "webhookId": "wh_abc123",
  "data": {
    "videoId": "video_123",
    "projectId": "proj_456",
    "status": "READY",
    "duration": 120.5,
    "playbackUrl": "https://stream.koko.com/video_123/playlist.m3u8",
    "thumbnail": "https://cdn.koko.com/thumbnails/video_123.jpg"
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | Event type (e.g., "video.ready") |
| `timestamp` | ISO 8601 | When event occurred |
| `webhookId` | string | Webhook that received event |
| `data` | object | Event-specific payload |

---

## 🧪 Testing Scenarios

### Scale Phase Testing
- [ ] Create webhook with HTTPS URL
- [ ] Create webhook with HTTP URL (should fail)
- [ ] Create webhook with invalid events (should fail)
- [ ] Get webhook details
- [ ] List all user webhooks
- [ ] Update webhook events
- [ ] Update webhook URL
- [ ] Enable/disable webhook
- [ ] Delete webhook
- [ ] Send test payload
- [ ] Test delivery succeeds (200 OK)
- [ ] Test delivery fails (500 error)
- [ ] Verify HMAC signature
- [ ] Verify timestamp validation
- [ ] Get delivery history
- [ ] Filter deliveries by status
- [ ] Redeliver failed delivery
- [ ] Redeliver successful delivery (should fail)
- [ ] Automatic retry on failure
- [ ] Exponential backoff delays

### Edge Cases
- [ ] Webhook endpoint timeout (30s)
- [ ] Webhook endpoint returns 301 redirect
- [ ] Webhook endpoint returns invalid response
- [ ] Concurrent deliveries to same webhook
- [ ] Very large payload (> 1MB)
- [ ] Invalid HMAC signature
- [ ] Replay attack (old timestamp)
- [ ] Delivery after webhook deleted

---

## 🔗 Integration Examples

### Slack Webhook

```typescript
// Create Slack webhook
const { webhook } = await trpc.webhook.create.mutate({
  name: "Slack Notifications",
  url: "https://hooks.slack.com/services/T00/B00/xxx",
  events: ["video.ready", "video.failed", "comment.created"],
});

// Slack endpoint receives:
{
  "event": "video.ready",
  "data": {
    "videoId": "video_123",
    "playbackUrl": "https://stream.koko.com/..."
  }
}

// Transform to Slack format:
{
  "text": "🎥 Video is ready!",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Video ID:* video_123\n*Status:* Ready"
      },
      "accessory": {
        "type": "button",
        "text": { "type": "plain_text", "text": "View Video" },
        "url": "https://koko.com/videos/video_123"
      }
    }
  ]
}
```

### Custom Backend

```typescript
// Express.js webhook receiver
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

app.post("/webhooks/koko", (req, res) => {
  // Verify signature
  const signature = req.headers["x-koko-signature"];
  const timestamp = req.headers["x-koko-timestamp"];
  
  try {
    verifyWebhookSignature({
      payload: JSON.stringify(req.body),
      signature,
      timestamp,
      secret: process.env.KOKO_WEBHOOK_SECRET,
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid signature" });
  }
  
  // Handle event
  const { event, data } = req.body;
  
  switch (event) {
    case "video.ready":
      console.log(`Video ${data.videoId} is ready!`);
      // Send email, update database, etc.
      break;
      
    case "comment.created":
      console.log(`New comment on video ${data.videoId}`);
      // Notify team, create task, etc.
      break;
  }
  
  // Respond quickly (< 5s)
  res.json({ received: true });
});
```

---

## 📚 Related Documentation

- [Videos API](./04-videos) - Video events
- [Comments API](./05-comments) - Comment events
- [Projects API](./03-projects) - Project events
- [Teams API](./08-teams) - Team events *(Growth Phase)*
- [Billing API](./13-billing) - Payment events

---

## 🔗 External Resources

- [Webhook Best Practices](https://webhooks.fyi/)
- [HMAC Signature Verification](https://en.wikipedia.org/wiki/HMAC)
- [Retry Strategies](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [Webhook Security](https://webhooks.fyi/security/hmac)
