---
title: Guest Access API
description: External review links, guest permissions, and unauthenticated viewer management
---

# 🔗 Guest Access API

## Overview

The Guest Access domain enables sharing videos and projects with external reviewers who don't have Koko accounts. This is critical for client reviews, stakeholder approvals, and external feedback collection without requiring account creation.

---

## 📌 Quick Reference

### Post-Launch Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `guest.createLink` | Mutation | Yes | Generate shareable review link |
| `guest.getAll` | Query | Yes | List all guest links for resource |
| `guest.getById` | Query | Yes | Get guest link details |
| `guest.update` | Mutation | Yes | Update link settings |
| `guest.revoke` | Mutation | Yes | Revoke/disable link |
| `guest.validateAccess` | Query | No | Validate guest token |

### Growth Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `guest.setPassword` | Mutation | Yes | Add password protection | High |
| `guest.setExpiry` | Mutation | Yes | Set expiration date | High |
| `guest.setWatermark` | Mutation | Yes | Enable viewer watermark | Medium |
| `guest.trackView` | Mutation | No | Log guest view activity | Medium |
| `guest.getAnalytics` | Query | Yes | View engagement stats | Medium |
| `guest.bulkCreate` | Mutation | Yes | Create multiple links | Low |

### Scale Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `guest.setDomainRestriction` | Mutation | Yes | Restrict by email domain | High |
| `guest.requireEmail` | Mutation | Yes | Require email to view | Medium |
| `guest.setDownloadPermission` | Mutation | Yes | Allow/deny downloads | Medium |
| `guest.ipWhitelist` | Mutation | Yes | Restrict by IP | Low |

---

## 📦 Data Models

### GuestLink

```typescript
interface GuestLink {
  id: string;                      // Unique identifier
  token: string;                   // Secure access token (URL-safe)
  
  // Resource reference
  resourceType: 'video' | 'project' | 'playlist';
  resourceId: string;              // Video, project, or playlist ID
  
  // Creator info
  createdBy: string;               // User ID who created link
  
  // Access settings
  permissions: GuestPermissions;
  
  // Security
  password?: string;               // Hashed password (optional)
  expiresAt?: DateTime;            // Expiration date (optional)
  maxViews?: number;               // Max view count (optional)
  allowedDomains?: string[];       // Email domain whitelist
  allowedIps?: string[];           // IP whitelist
  
  // Watermark
  watermarkEnabled: boolean;
  watermarkText?: string;          // Custom watermark text
  
  // Status
  status: 'active' | 'expired' | 'revoked';
  viewCount: number;               // Total views
  lastViewedAt?: DateTime;         // Last access time
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface GuestPermissions {
  canComment: boolean;             // Can leave comments
  canDownload: boolean;            // Can download video
  canViewComments: boolean;        // Can see existing comments
  canSeeOtherGuests: boolean;      // Can see other guest activity
  requireEmail: boolean;           // Must provide email to view
}
```

### GuestView

```typescript
interface GuestView {
  id: string;
  guestLinkId: string;
  
  // Viewer info (if collected)
  email?: string;                  // Email if required/provided
  name?: string;                   // Name if provided
  
  // Session info
  ipAddress: string;
  userAgent: string;
  country?: string;                // Geo-located country
  
  // Engagement
  viewDuration: number;            // Seconds watched
  completionRate: number;          // 0-100 percentage
  
  // Timestamps
  viewedAt: DateTime;
}
```

### Drizzle Schema

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const guestLink = sqliteTable(
  "guest_link",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    
    resourceType: text("resource_type", { 
      enum: ["video", "project", "playlist"] 
    }).notNull(),
    resourceId: text("resource_id").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    // Permissions stored as JSON
    permissions: text("permissions", { mode: "json" })
      .$type<GuestPermissions>()
      .notNull(),
    
    // Security
    password: text("password"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    maxViews: integer("max_views"),
    allowedDomains: text("allowed_domains", { mode: "json" }).$type<string[]>(),
    allowedIps: text("allowed_ips", { mode: "json" }).$type<string[]>(),
    
    // Watermark
    watermarkEnabled: integer("watermark_enabled", { mode: "boolean" })
      .default(false)
      .notNull(),
    watermarkText: text("watermark_text"),
    
    // Status
    status: text("status", { enum: ["active", "expired", "revoked"] })
      .default("active")
      .notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    lastViewedAt: integer("last_viewed_at", { mode: "timestamp_ms" }),
    
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("guest_link_token_idx").on(table.token),
    index("guest_link_resource_idx").on(table.resourceType, table.resourceId),
    index("guest_link_creator_idx").on(table.createdBy),
    index("guest_link_status_idx").on(table.status),
  ]
);

export const guestView = sqliteTable(
  "guest_view",
  {
    id: text("id").primaryKey(),
    guestLinkId: text("guest_link_id")
      .notNull()
      .references(() => guestLink.id, { onDelete: "cascade" }),
    
    email: text("email"),
    name: text("name"),
    
    ipAddress: text("ip_address").notNull(),
    userAgent: text("user_agent"),
    country: text("country"),
    
    viewDuration: integer("view_duration").default(0).notNull(),
    completionRate: integer("completion_rate").default(0).notNull(),
    
    viewedAt: integer("viewed_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("guest_view_link_idx").on(table.guestLinkId),
    index("guest_view_email_idx").on(table.email),
  ]
);
```

---

## 🚀 Post-Launch Endpoints

### 1. guest.createLink

**Status:** 🔄 Post-Launch

**Purpose:** Generate a shareable review link for a video, project, or playlist

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner or editor

**Input Schema:**

```typescript
{
  resourceType: z.enum(['video', 'project', 'playlist']),
  resourceId: z.string(),
  
  // Optional settings
  permissions: z.object({
    canComment: z.boolean().default(true),
    canDownload: z.boolean().default(false),
    canViewComments: z.boolean().default(true),
    canSeeOtherGuests: z.boolean().default(false),
    requireEmail: z.boolean().default(false),
  }).optional(),
  
  expiresAt: z.date().optional(),
  maxViews: z.number().positive().optional(),
  password: z.string().min(4).max(50).optional(),
  
  // Custom label for internal tracking
  label: z.string().max(100).optional(),
}
```

**Response Schema:**

```typescript
{
  guestLink: GuestLink;
  shareUrl: string;              // Full shareable URL
  shortUrl?: string;             // Shortened URL (if enabled)
}
```

**Example Request:**

```typescript
const { guestLink, shareUrl } = await trpc.guest.createLink.mutate({
  resourceType: "video",
  resourceId: "507f1f77bcf86cd799439012",
  permissions: {
    canComment: true,
    canDownload: false,
    canViewComments: true,
    requireEmail: true,
  },
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  label: "Client Review - Acme Corp",
});

console.log(shareUrl);
// "https://app.koko.dev/review/abc123xyz789"
```

**Example Response:**

```json
{
  "guestLink": {
    "id": "507f1f77bcf86cd799439050",
    "token": "abc123xyz789",
    "resourceType": "video",
    "resourceId": "507f1f77bcf86cd799439012",
    "permissions": {
      "canComment": true,
      "canDownload": false,
      "canViewComments": true,
      "canSeeOtherGuests": false,
      "requireEmail": true
    },
    "expiresAt": "2025-01-22T10:30:00Z",
    "status": "active",
    "viewCount": 0,
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "shareUrl": "https://app.koko.dev/review/abc123xyz789"
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not owner/editor of resource
- `NOT_FOUND` - Resource does not exist
- `BAD_REQUEST` - Invalid expiration date (past)

**Business Rules:**

1. Token must be URL-safe and cryptographically random
2. Expiration date must be in the future
3. Password is hashed before storage (never stored plaintext)
4. Default permissions: can comment + view comments
5. Link inherits project's permission model

**Side Effects:**

- Guest link record created
- Notification sent to resource owner (if different from creator)
- Activity logged for audit

---

### 2. guest.getAll

**Status:** 🔄 Post-Launch

**Purpose:** List all guest links for a resource

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be project owner or editor

**Input Schema:**

```typescript
{
  resourceType: z.enum(['video', 'project', 'playlist']),
  resourceId: z.string(),
  
  // Filtering
  status: z.enum(['active', 'expired', 'revoked']).optional(),
  
  // Pagination
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  guestLinks: Array<GuestLink & {
    creator: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  nextCursor?: string;
  total: number;
}
```

---

### 3. guest.getById

**Status:** 🔄 Post-Launch

**Purpose:** Get detailed information about a guest link

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be project owner or editor

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Response Schema:**

```typescript
{
  guestLink: GuestLink & {
    creator: { id: string; name: string; image?: string };
    recentViews: GuestView[];
    resource: {
      id: string;
      title: string;
      thumbnailUrl?: string;
    };
  };
}
```

---

### 4. guest.update

**Status:** 🔄 Post-Launch

**Purpose:** Update guest link settings

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be link creator or project owner

**Input Schema:**

```typescript
{
  id: z.string(),
  
  permissions: z.object({
    canComment: z.boolean(),
    canDownload: z.boolean(),
    canViewComments: z.boolean(),
    canSeeOtherGuests: z.boolean(),
    requireEmail: z.boolean(),
  }).partial().optional(),
  
  expiresAt: z.date().nullable().optional(),
  maxViews: z.number().positive().nullable().optional(),
  label: z.string().max(100).optional(),
}
```

**Response Schema:**

```typescript
{
  guestLink: GuestLink;
}
```

---

### 5. guest.revoke

**Status:** 🔄 Post-Launch

**Purpose:** Revoke/disable a guest link immediately

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be link creator or project owner

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

**Business Rules:**

1. Link immediately becomes inaccessible
2. Existing viewers are disconnected
3. Cannot be undone (create new link instead)
4. Activity logged for audit

---

### 6. guest.validateAccess

**Status:** 🔄 Post-Launch

**Purpose:** Validate guest token and return resource access (called by guest reviewer)

**Type:** Query

**Auth Required:** No (uses guest token)

**Input Schema:**

```typescript
{
  token: z.string(),
  password: z.string().optional(),
  email: z.string().email().optional(),
}
```

**Response Schema:**

```typescript
{
  valid: boolean;
  requiresPassword: boolean;
  requiresEmail: boolean;
  
  // Only included if valid
  resource?: {
    type: 'video' | 'project' | 'playlist';
    id: string;
    title: string;
    streamingUrl?: string;
    thumbnailUrl?: string;
  };
  permissions?: GuestPermissions;
  watermark?: {
    enabled: boolean;
    text: string;
  };
}
```

**Example Request (password protected):**

```typescript
// First call - check requirements
const check = await trpc.guest.validateAccess.query({
  token: "abc123xyz789",
});
// { valid: false, requiresPassword: true, requiresEmail: false }

// Second call - with password
const access = await trpc.guest.validateAccess.query({
  token: "abc123xyz789",
  password: "review2025",
});
// { valid: true, resource: {...}, permissions: {...} }
```

**Error Codes:**

- `NOT_FOUND` - Invalid or expired token
- `FORBIDDEN` - Incorrect password or email domain
- `GONE` - Link has been revoked

---

## 🔮 Growth Endpoints

### guest.setPassword

**Priority:** High  
**Purpose:** Add or update password protection  
**Complexity:** Simple

**Input:**
```typescript
{
  id: z.string(),
  password: z.string().min(4).max(50).nullable(), // null removes password
}
```

---

### guest.setExpiry

**Priority:** High  
**Purpose:** Set or update expiration date  
**Complexity:** Simple

**Input:**
```typescript
{
  id: z.string(),
  expiresAt: z.date().nullable(), // null removes expiration
}
```

---

### guest.setWatermark

**Priority:** Medium  
**Purpose:** Enable dynamic watermark on video playback  
**Complexity:** Medium (player integration)

**Input:**
```typescript
{
  id: z.string(),
  enabled: z.boolean(),
  text: z.string().max(100).optional(), // Default: viewer email/IP
  position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']).optional(),
  opacity: z.number().min(0.1).max(1).optional(),
}
```

**Use Case:** Deter unauthorized sharing by overlaying viewer-specific watermark

---

### guest.trackView

**Priority:** Medium  
**Purpose:** Log guest viewing activity (analytics)  
**Complexity:** Simple

**Input:**
```typescript
{
  token: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  viewDuration: z.number(),
  completionRate: z.number().min(0).max(100),
}
```

**Note:** Called periodically during playback to track engagement

---

### guest.getAnalytics

**Priority:** Medium  
**Purpose:** Get engagement analytics for guest link  
**Complexity:** Medium (aggregation)

**Response:**
```typescript
{
  totalViews: number;
  uniqueViewers: number;
  avgWatchTime: number;
  avgCompletionRate: number;
  viewsByDate: Array<{ date: string; count: number }>;
  viewsByCountry: Array<{ country: string; count: number }>;
  topViewers: Array<{
    email?: string;
    viewCount: number;
    totalWatchTime: number;
  }>;
}
```

---

## 🎯 Scale Endpoints

### guest.setDomainRestriction

**Priority:** High  
**Purpose:** Restrict access to specific email domains  
**Complexity:** Simple

**Input:**
```typescript
{
  id: z.string(),
  allowedDomains: z.array(z.string()).max(20), // e.g., ["acme.com", "agency.io"]
}
```

**Use Case:** Only allow `@client.com` emails to access review

---

### guest.requireEmail

**Priority:** Medium  
**Purpose:** Require email verification before viewing  
**Complexity:** Medium (email flow)

**Flow:**
1. Guest enters email
2. Verification code sent
3. Guest enters code
4. Access granted + email logged

---

### guest.ipWhitelist

**Priority:** Low  
**Purpose:** Restrict access by IP address/range  
**Complexity:** Simple

**Input:**
```typescript
{
  id: z.string(),
  allowedIps: z.array(z.string()).max(50), // Supports CIDR notation
}
```

---

## 🔒 Security Considerations

### Token Security
- Tokens are 32-byte cryptographically random strings
- URL-safe encoding (base64url)
- Tokens cannot be enumerated (not sequential)
- Rate limiting on validation endpoint

### Password Protection
- Passwords hashed with bcrypt (never stored plaintext)
- Rate limiting: 5 attempts per minute per IP
- Generic error messages (don't reveal if link exists)

### Watermarking
- Viewer-specific watermark deters unauthorized sharing
- Can include: email, IP, timestamp, custom text
- Rendered on video player (cannot be removed)

### Expiration & Revocation
- Expired links immediately inaccessible
- Revocation is instant and irreversible
- Background job cleans up expired links after 30 days

---

## 🧪 Testing Scenarios

### Post-Launch Testing
- [ ] Create guest link for video
- [ ] Create guest link for project
- [ ] Create password-protected link
- [ ] Create link with expiration
- [ ] Validate access with correct token
- [ ] Validate access with wrong password
- [ ] Access expired link (should fail)
- [ ] Revoke link and verify inaccessible
- [ ] Guest comment on video
- [ ] Guest cannot download when disabled

### Security Testing
- [ ] Cannot access revoked link
- [ ] Password not exposed in responses
- [ ] Rate limiting on validation
- [ ] Domain restriction enforced
- [ ] Watermark visible in player

---

## 📚 Related Documentation

- [Videos API](./04-videos) - Video resources
- [Projects API](./03-projects) - Project resources
- [Permissions API](./09-permissions) - Internal permissions
- [Analytics API](./18-analytics) - Engagement tracking

---

## 🔗 External Resources

- [Secure Token Generation](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Frame.io Guest Review](https://frame.io/) - Competitive reference
