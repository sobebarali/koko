---
title: API Overview
description: Complete API reference for Koko video collaboration platform
---

# Koko API Documentation

## 🎯 Introduction

Koko provides a type-safe, end-to-end API built with tRPC for video collaboration. All endpoints are automatically typed from server to client, ensuring complete type safety across your entire application.

## 🏗️ Architecture

- **API Framework:** tRPC v11.5.0 (end-to-end type-safe APIs)
- **Server:** Hono v4.8.2 (lightweight, fast HTTP server)
- **Database:** SQLite/Turso with Drizzle ORM
- **Authentication:** Better-Auth v1.4.0
- **Video Infrastructure:** Bunny Stream (managed video platform)
- **Type Safety:** Full TypeScript coverage with strict mode

## 🔑 Authentication

All protected endpoints require a valid session cookie (`better-auth.session_token`).

### Session Management
- **Lifetime:** 7 days (sliding window)
- **Cookie:** HttpOnly, Secure (production), SameSite=lax
- **Renewal:** Automatic on activity
- **Cookie Cache:** 5 minutes for performance

### Making Authenticated Requests

```typescript
import { trpc } from "@/lib/trpc";

// Client automatically sends session cookie
const user = await trpc.user.getProfile.query();
```

## 📊 API Endpoints - Master Quick Reference

### Legend
- ✅ **MVP** - Available at launch (Ship in 4-6 weeks)
- 🔄 **Post-Launch** - Month 1-2 after launch
- 📋 **Growth** - Month 3-6
- 🎯 **Scale** - Month 6+

---

### 🔐 Authentication Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| ✅ | `auth.signUp` | Mutation | No | Register new user |
| ✅ | `auth.signIn` | Mutation | No | Login with email/password |
| ✅ | `auth.signOut` | Mutation | Yes | Logout current session |
| ✅ | `auth.getSession` | Query | Yes | Get current session |
| 🔄 | `auth.verifyEmail` | Mutation | No | Verify email address |
| 🔄 | `auth.requestPasswordReset` | Mutation | No | Request password reset |
| 🔄 | `auth.resetPassword` | Mutation | No | Reset password with token |
| 🔄 | `auth.changePassword` | Mutation | Yes | Change password (logged in) |
| 📋 | `auth.oauth.google` | Mutation | No | Sign in with Google |
| 📋 | `auth.oauth.github` | Mutation | No | Sign in with GitHub |
| 📋 | `auth.listSessions` | Query | Yes | List all active sessions |
| 📋 | `auth.revokeSession` | Mutation | Yes | Revoke specific session |
| 🎯 | `auth.twoFactor.enable` | Mutation | Yes | Enable 2FA |
| 🎯 | `auth.twoFactor.verify` | Mutation | Yes | Verify 2FA code |

**MVP Total:** 4 endpoints  
**Roadmap Total:** +10 endpoints

---

### 👤 Users Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| ✅ | `user.getProfile` | Query | Yes | Get current user profile |
| ✅ | `user.getById` | Query | Yes | Get user by ID |
| ✅ | `user.updateProfile` | Mutation | Yes | Update profile info |
| ✅ | `user.uploadAvatar` | Mutation | Yes | Upload profile picture |
| 🔄 | `user.updatePreferences` | Mutation | Yes | Update user preferences |
| 🔄 | `user.search` | Query | Yes | Search users |
| 📋 | `user.getActivity` | Query | Yes | Get user activity feed |
| 📋 | `user.block` | Mutation | Yes | Block a user |
| 📋 | `user.unblock` | Mutation | Yes | Unblock a user |
| 🎯 | `user.export` | Query | Yes | Export user data (GDPR) |
| 🎯 | `user.delete` | Mutation | Yes | Delete account |

**MVP Total:** 4 endpoints  
**Roadmap Total:** +7 endpoints

---

### 📁 Projects Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| ✅ | `project.create` | Mutation | Yes | Create new project |
| ✅ | `project.getById` | Query | Yes | Get project details |
| ✅ | `project.getAll` | Query | Yes | List user's projects |
| ✅ | `project.update` | Mutation | Yes | Update project metadata |
| ✅ | `project.delete` | Mutation | Yes | Delete project |
| 🔄 | `project.archive` | Mutation | Yes | Archive project |
| 🔄 | `project.restore` | Mutation | Yes | Restore archived project |
| 🔄 | `project.duplicate` | Mutation | Yes | Duplicate project |
| 📋 | `project.search` | Query | Yes | Search projects |
| 📋 | `project.getStats` | Query | Yes | Project statistics |
| 📋 | `project.bulkDelete` | Mutation | Yes | Delete multiple projects |
| 🎯 | `project.template.create` | Mutation | Yes | Create project template |
| 🎯 | `project.template.use` | Mutation | Yes | Create from template |

**MVP Total:** 5 endpoints  
**Roadmap Total:** +8 endpoints

---

### 🎬 Videos Domain (CORE MVP)

> **Note:** Video upload uses Bunny Stream for managed video hosting, transcoding, and global CDN delivery. See [Videos API](./04-videos) for Bunny integration details.

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| ✅ | `video.createUpload` | Mutation | Yes | Create video & get TUS upload endpoint |
| ✅ | `video.getById` | Query | Yes | Get video details |
| ✅ | `video.getAll` | Query | Yes | List videos in project |
| ✅ | `video.updateMetadata` | Mutation | Yes | Update title/description/tags |
| ✅ | `video.delete` | Mutation | Yes | Delete video |
| ✅ | `video.getPlaybackUrl` | Query | Yes | Get streaming URL |
| 🔄 | `video.updateThumbnail` | Mutation | Yes | Upload custom thumbnail |
| 🔄 | `video.getProcessingStatus` | Query | Yes | Get transcode status |
| 🔄 | `video.downloadOriginal` | Query | Yes | Download source file |
| 🔄 | `video.bulkDelete` | Mutation | Yes | Delete multiple videos |
| 🔄 | `video.duplicate` | Mutation | Yes | Copy video to another project |
| 📋 | `video.search` | Query | Yes | Full-text search videos |
| 📋 | `video.getAnalytics` | Query | Yes | View count, engagement stats |
| 📋 | `video.generateProxy` | Mutation | Yes | Create lower quality proxy |
| 📋 | `video.extractAudio` | Mutation | Yes | Extract audio track |
| 📋 | `video.addSubtitles` | Mutation | Yes | Upload SRT/VTT subtitles |
| 🎯 | `video.transcribe` | Mutation | Yes | Auto-generate subtitles (AI) |
| 🎯 | `video.detectScenes` | Query | Yes | AI scene detection |
| 🎯 | `video.generateAIThumbnails` | Mutation | Yes | AI thumbnail suggestions |
| 🎯 | `video.liveStream` | Mutation | Yes | Start live stream |

**MVP Total:** 6 endpoints  
**Roadmap Total:** +14 endpoints

---

### 💬 Comments Domain (CORE MVP)

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| ✅ | `comment.create` | Mutation | Yes | Create comment (with timecode) |
| ✅ | `comment.getAll` | Query | Yes | Get all comments for video |
| ✅ | `comment.getById` | Query | Yes | Get single comment |
| ✅ | `comment.reply` | Mutation | Yes | Reply to comment |
| ✅ | `comment.update` | Mutation | Yes | Edit comment text |
| ✅ | `comment.delete` | Mutation | Yes | Delete comment |
| ✅ | `comment.resolve` | Mutation | Yes | Mark comment as resolved |
| 🔄 | `comment.unresolve` | Mutation | Yes | Reopen resolved comment |
| 🔄 | `comment.mention` | Mutation | Yes | Mention user (@username) |
| 🔄 | `comment.search` | Query | Yes | Search comments |
| 📋 | `comment.bulkResolve` | Mutation | Yes | Resolve multiple comments |
| 📋 | `comment.export` | Query | Yes | Export comments (PDF/CSV) |
| 📋 | `comment.getThread` | Query | Yes | Get full comment thread |
| 🎯 | `comment.translate` | Mutation | Yes | Translate comment (AI) |
| 🎯 | `comment.summarize` | Query | Yes | AI summary of all comments |

**MVP Total:** 7 endpoints  
**Roadmap Total:** +8 endpoints

---

### 🎨 Annotations Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 🔄 | `annotation.create` | Mutation | Yes | Create frame annotation |
| 🔄 | `annotation.getAll` | Query | Yes | Get annotations for video |
| 🔄 | `annotation.update` | Mutation | Yes | Update annotation |
| 🔄 | `annotation.delete` | Mutation | Yes | Delete annotation |
| 📋 | `annotation.bulkDelete` | Mutation | Yes | Delete multiple |
| 📋 | `annotation.export` | Query | Yes | Export as image |
| 🎯 | `annotation.collaborate` | Mutation | Yes | Real-time drawing sync |

**Roadmap Total:** 7 endpoints

---

### 🔄 Versions Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 🔄 | `version.upload` | Mutation | Yes | Upload new version |
| 🔄 | `version.getAll` | Query | Yes | List all versions |
| 🔄 | `version.setActive` | Mutation | Yes | Set active version |
| 🔄 | `version.compare` | Query | Yes | Side-by-side comparison |
| 📋 | `version.delete` | Mutation | Yes | Delete version |
| 📋 | `version.label` | Mutation | Yes | Add label/tag to version |
| 🎯 | `version.diff` | Query | Yes | AI visual diff |

**Roadmap Total:** 7 endpoints

---

### 👥 Teams Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 📋 | `team.create` | Mutation | Yes | Create team |
| 📋 | `team.getById` | Query | Yes | Get team details |
| 📋 | `team.update` | Mutation | Yes | Update team settings |
| 📋 | `team.invite` | Mutation | Yes | Invite member |
| 📋 | `team.removeMember` | Mutation | Yes | Remove member |
| 📋 | `team.updateRole` | Mutation | Yes | Change member role |
| 🎯 | `team.getStats` | Query | Yes | Team analytics |
| 🎯 | `team.billing` | Query | Yes | Team billing info |

**Roadmap Total:** 8 endpoints

---

### 🔒 Permissions Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 🔄 | `permission.share` | Mutation | Yes | Generate share link |
| 🔄 | `permission.revoke` | Mutation | Yes | Revoke access |
| 🔄 | `permission.listShares` | Query | Yes | List all shares |
| 📋 | `permission.setRole` | Mutation | Yes | Set user role on project |
| 📋 | `permission.setExpiry` | Mutation | Yes | Set link expiration |
| 📋 | `permission.passwordProtect` | Mutation | Yes | Add password to link |
| 🎯 | `permission.watermark` | Mutation | Yes | Add watermark for viewers |

**Roadmap Total:** 7 endpoints

---

### 🔔 Notifications Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 🔄 | `notification.getAll` | Query | Yes | Get all notifications |
| 🔄 | `notification.markRead` | Mutation | Yes | Mark as read |
| 🔄 | `notification.markAllRead` | Mutation | Yes | Mark all as read |
| 🔄 | `notification.updatePreferences` | Mutation | Yes | Notification settings |
| 📋 | `notification.subscribe` | Mutation | Yes | WebSocket subscription |
| 📋 | `notification.unsubscribe` | Mutation | Yes | Unsubscribe |
| 🎯 | `notification.digest` | Query | Yes | Email digest settings |

**Roadmap Total:** 7 endpoints

---

### 📎 Assets Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 📋 | `asset.upload` | Mutation | Yes | Upload supporting file |
| 📋 | `asset.getAll` | Query | Yes | List assets |
| 📋 | `asset.delete` | Mutation | Yes | Delete asset |
| 📋 | `asset.createFolder` | Mutation | Yes | Create folder |
| 🎯 | `asset.search` | Query | Yes | Search assets |
| 🎯 | `asset.tag` | Mutation | Yes | Tag assets |

**Roadmap Total:** 6 endpoints

---

### 🔗 Webhooks Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 🎯 | `webhook.create` | Mutation | Yes | Register webhook |
| 🎯 | `webhook.getAll` | Query | Yes | List webhooks |
| 🎯 | `webhook.delete` | Mutation | Yes | Delete webhook |
| 🎯 | `webhook.test` | Mutation | Yes | Test webhook |

**Roadmap Total:** 4 endpoints

---

### 💳 Billing & Subscriptions Domain (CRITICAL - MVP)

> **Note:** Uses Polar.sh for payment processing. Required for monetization strategy.

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| ✅ | `billing.getPlans` | Query | No | List available pricing plans |
| ✅ | `billing.getCurrentPlan` | Query | Yes | Get user's current subscription |
| ✅ | `billing.subscribe` | Mutation | Yes | Subscribe to plan (Polar checkout) |
| ✅ | `billing.cancelSubscription` | Mutation | Yes | Cancel subscription |
| ✅ | `billing.updatePaymentMethod` | Mutation | Yes | Update credit card |
| 🔄 | `billing.getInvoices` | Query | Yes | List past invoices |
| 🔄 | `billing.downloadInvoice` | Query | Yes | Download PDF invoice |
| 🔄 | `billing.getUsage` | Query | Yes | Get current usage stats |
| 🔄 | `billing.previewUpgrade` | Query | Yes | Preview cost of upgrading |
| 📋 | `billing.addSeats` | Mutation | Yes | Add team seats |
| 📋 | `billing.removeSeats` | Mutation | Yes | Remove team seats |
| 📋 | `billing.applyPromoCode` | Mutation | Yes | Apply discount code |
| 🎯 | `billing.reactivate` | Mutation | Yes | Reactivate canceled subscription |
| 🎯 | `billing.requestRefund` | Mutation | Yes | Request refund |

**MVP Total:** 5 endpoints  
**Roadmap Total:** +9 endpoints

**Pricing Tiers:**
- **Free:** $0 - 2 projects, 5 videos, 10GB, 2 members
- **Pro:** $29/mo - Unlimited projects, 50 videos, 100GB, 10 members
- **Team:** $99/mo - 200 videos, 500GB, 50 members, priority support
- **Enterprise:** Custom - Unlimited, SSO, SLA, white labeling

---

### 📊 Quota & Usage Domain (CRITICAL - MVP)

> **Note:** Tracks usage and enforces plan limits. Critical for freemium model.

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| ✅ | `quota.getCurrent` | Query | Yes | Get current usage vs limits |
| ✅ | `quota.checkLimit` | Query | Yes | Check if action allowed |
| 🔄 | `quota.getHistory` | Query | Yes | Historical usage data |
| 📋 | `quota.requestIncrease` | Mutation | Yes | Request limit increase |
| 📋 | `quota.getBreakdown` | Query | Yes | Detailed usage breakdown |

**MVP Total:** 2 endpoints  
**Roadmap Total:** +3 endpoints

**Tracked Resources:**
- Projects, Videos, Storage (GB), Team Members, Bandwidth, API Calls
- Real-time calculations with 5-minute cache
- Soft limits (80% warning), Hard limits (100% block)

---

### 🔍 Search & Discovery Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 📋 | `search.global` | Query | Yes | Unified search across all resources |
| 📋 | `search.videos` | Query | Yes | Advanced video search with filters |
| 📋 | `search.projects` | Query | Yes | Project-specific search |
| 📋 | `search.comments` | Query | Yes | Comment search |
| 🎯 | `search.advanced` | Query | Yes | Boolean queries, facets |
| 🎯 | `search.suggestions` | Query | Yes | AI autocomplete |

**Roadmap Total:** 6 endpoints

---

### 🏷️ Tags & Labels Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 📋 | `tag.create` | Mutation | Yes | Create custom tag |
| 📋 | `tag.getAll` | Query | Yes | List all tags |
| 📋 | `tag.update` | Mutation | Yes | Rename/recolor tag |
| 📋 | `tag.delete` | Mutation | Yes | Delete tag |
| 📋 | `tag.merge` | Mutation | Yes | Merge two tags |
| 🎯 | `tag.suggest` | Query | Yes | AI tag suggestions |

**Roadmap Total:** 6 endpoints

---

### 📊 Analytics Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 📋 | `analytics.overview` | Query | Yes | Dashboard metrics |
| 📋 | `analytics.videoPerformance` | Query | Yes | Video engagement stats |
| 📋 | `analytics.teamActivity` | Query | Yes | Collaboration metrics |
| 📋 | `analytics.export` | Mutation | Yes | Export analytics (CSV/PDF) |
| 📋 | `analytics.customReport` | Mutation | Yes | Create custom reports |

**Roadmap Total:** 5 endpoints

---

### 🛡️ Compliance & Security Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 🎯 | `compliance.exportData` | Mutation | Yes | GDPR data export |
| 🎯 | `compliance.deleteData` | Mutation | Yes | Right to erasure |
| 🎯 | `compliance.auditLog` | Query | Yes | Security audit trail |
| 🎯 | `compliance.downloadReport` | Mutation | Yes | Compliance reports (SOC2, HIPAA) |
| 🎯 | `compliance.ipWhitelist` | Mutation | Yes | IP whitelist management |

**Roadmap Total:** 5 endpoints

---

### 🎫 Invitations Domain

| Status | Endpoint | Type | Auth | Purpose |
|--------|----------|------|------|---------|
| 🔄 | `invitation.send` | Mutation | Yes | Send team/project invite |
| 🔄 | `invitation.accept` | Mutation | No | Accept invitation |
| 🔄 | `invitation.decline` | Mutation | No | Decline invitation |
| 🔄 | `invitation.cancel` | Mutation | Yes | Cancel pending invite |
| 🔄 | `invitation.listPending` | Query | Yes | List sent/received invites |
| 📋 | `invitation.resend` | Mutation | Yes | Resend email |
| 📋 | `invitation.bulkInvite` | Mutation | Yes | Bulk CSV import |

**Roadmap Total:** 7 endpoints

---

## 📈 Release Roadmap Summary

### MVP (Launch) - 4-6 weeks
**Total Endpoints:** 33 endpoints  
**Domains:** Authentication (4), Users (4), Projects (5), Videos (6), Comments (7), **Billing (5)**, **Quota (2)**  
**Focus:** Core video collaboration workflow + monetization  
**Goal:** Ship working freemium product for early adopters

### Post-Launch - Month 1-2
**Additional Endpoints:** +29 endpoints  
**Total Cumulative:** 62 endpoints  
**Domains:** Enhanced auth (4), Enhanced videos (5), Annotations (4), Versions (4), Permissions (3), Notifications (4), User enhancements (2), Billing (4), Quota (1)  
**Focus:** Polish UX + quick wins based on user feedback  
**Goal:** Improve retention and user satisfaction

### Growth - Month 3-6
**Additional Endpoints:** +42 endpoints  
**Total Cumulative:** 104 endpoints  
**Domains:** Teams (6), Advanced videos (5), Advanced comments (3), Assets (4), OAuth (2), Advanced permissions (3), Enhanced notifications (2), User features (2), Project features (3), Billing (4), Quota (2), Invitations (7), Search (4), Tags (5), Analytics (5)  
**Focus:** Team collaboration + differentiation features  
**Goal:** Expand to team/enterprise use cases

### Scale - Month 6+
**Additional Endpoints:** +28 endpoints  
**Total Cumulative:** 132 endpoints  
**Domains:** AI features (8), Webhooks (4), Advanced teams (2), Enterprise features (7), Billing (2), Compliance (5), Advanced Search (2), Advanced Tags (1), Advanced Invitations (2)  
**Focus:** Enterprise readiness + automation  
**Goal:** Compete with established players (Frame.io, etc.)

### Extended Domains (Competitive Parity)
**Additional Endpoints:** +80+ endpoints across 10 new domains  
**Domains:** Guest Access, Approvals, Folders, Exports, Integrations, Playlists, Comparisons, Templates, Presence (real-time), AI Features  
**Focus:** Feature parity with Frame.io, Vimeo Review, and other competitors  
**Goal:** Full-featured video collaboration platform

---

## 🔧 Common Patterns

### Pagination

**Cursor-based** (recommended for real-time data):
```typescript
{
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(), // Last item ID from previous page
}

// Response
{
  items: T[];
  nextCursor?: string; // undefined = no more pages
}
```

**Offset-based** (for page numbers):
```typescript
{
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
}

// Response
{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### Filtering

```typescript
{
  filters: {
    status: z.enum(['active', 'archived']).optional(),
    tags: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.date(),
      to: z.date(),
    }).optional(),
    search: z.string().optional(),
  }.optional(),
}
```

### Sorting

```typescript
{
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}
```

### File Uploads

#### Video Uploads (Bunny Stream)

Videos use **Bunny Stream** with TUS resumable uploads:

```typescript
// 1. Create video & get TUS upload endpoint
const { video, tusEndpoint, authorizationSignature, libraryId, videoId } = 
  await trpc.video.createUpload.mutate({
    projectId: "507f1f77bcf86cd799439011",
    fileName: "demo.mp4",
    fileSize: 150000000,
    title: "Product Demo V1",
  });

// 2. Upload via TUS protocol (resumable)
import * as tus from "tus-js-client";

const upload = new tus.Upload(file, {
  endpoint: tusEndpoint, // https://video.bunnycdn.com/tusupload
  retryDelays: [0, 3000, 5000, 10000],
  headers: {
    AuthorizationSignature: authorizationSignature,
    AuthorizationExpire: expirationTime.toString(),
    VideoId: videoId,
    LibraryId: libraryId,
  },
  metadata: {
    filetype: file.type,
    title: "demo.mp4",
  },
  onProgress: (bytesUploaded, bytesTotal) => {
    const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
    console.log(percentage + "%");
  },
  onSuccess: () => {
    console.log("Upload complete! Video is processing...");
  },
  onError: (error) => {
    console.error("Upload failed:", error);
  },
});

upload.start();

// 3. Poll for processing completion
const processedVideo = await trpc.video.getById.query({ id: video.id });
// video.status: "uploading" → "processing" → "ready"
```

#### Other File Uploads (S3 Pre-signed URLs)

For avatars, thumbnails, and assets, use pre-signed URLs:

```typescript
// 1. Request upload URL
const { uploadUrl, uploadFields } = await trpc.video.upload.mutate({
  fileName: "video.mp4",
  fileSize: 150000000,
  mimeType: "video/mp4",
});

// 2. Upload directly to S3
const formData = new FormData();
Object.entries(uploadFields).forEach(([key, value]) => {
  formData.append(key, value);
});
formData.append('file', file);

await fetch(uploadUrl, {
  method: 'POST',
  body: formData,
});

// 3. Poll for processing completion
const video = await trpc.video.getById.query({ id: videoId });
```

---

## ⚠️ Error Handling

All endpoints may return these tRPC error codes:

| Code | HTTP | Description | When to Use |
|------|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input data | Validation failures |
| `UNAUTHORIZED` | 401 | Not authenticated | Missing/invalid session |
| `FORBIDDEN` | 403 | Insufficient permissions | User lacks access rights |
| `NOT_FOUND` | 404 | Resource not found | ID doesn't exist |
| `CONFLICT` | 409 | Resource conflict | Duplicate email, etc. |
| `PRECONDITION_FAILED` | 412 | Precondition not met | Video not ready, etc. |
| `PAYLOAD_TOO_LARGE` | 413 | File too large | Exceeds size limit |
| `TOO_MANY_REQUESTS` | 429 | Rate limited | Exceeded request quota |
| `INTERNAL_SERVER_ERROR` | 500 | Server error | Unexpected failures |

### Error Response Format

```typescript
{
  error: {
    code: "NOT_FOUND",
    message: "Video not found",
    data?: {
      // Additional context
      videoId: "507f1f77bcf86cd799439012"
    }
  }
}
```

### Error Handling Example

```typescript
import { TRPCError } from "@trpc/server";

try {
  const video = await trpc.video.getById.query({ id });
} catch (error) {
  if (error.data?.code === "NOT_FOUND") {
    // Handle not found
  } else if (error.data?.code === "FORBIDDEN") {
    // Handle permission denied
  } else {
    // Handle other errors
  }
}
```

---

## 🔐 Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Auth (login/signup) | 5 requests | per minute per IP |
| Auth (password reset) | 3 requests | per hour per email |
| Video upload | 10 uploads | per hour per user |
| File uploads (general) | 50 uploads | per hour per user |
| API calls (read) | 2000 requests | per hour per user |
| API calls (write) | 500 requests | per hour per user |
| Webhooks | 100 requests | per minute per endpoint |

### Rate Limit Headers

```
X-RateLimit-Limit: 2000
X-RateLimit-Remaining: 1997
X-RateLimit-Reset: 1705334400
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Rate limit exceeded. Try again in 45 seconds.",
    "data": {
      "retryAfter": 45,
      "limit": 2000,
      "window": "hour"
    }
  }
}
```

---

## 📝 API Conventions

### Naming Conventions
1. **Endpoints:** `domain.action` format (e.g., `video.upload`, `comment.create`)
2. **Query vs Mutation:** Queries for reads, Mutations for writes
3. **Pluralization:** Use singular (e.g., `video.getAll`, not `videos.getAll`)

### Data Formats
1. **IDs:** Text or Integer (configurable per table in Drizzle schema)
2. **Dates:** ISO 8601 DateTime strings (`2025-01-15T10:30:00Z`)
3. **Timecodes:** Decimal seconds (`125.5` = 2 minutes 5.5 seconds)
4. **File sizes:** Bytes as integers
5. **Durations:** Decimal seconds

### ID Format Examples
```typescript
// SQLite Text ID (various formats supported)
"user_abc123xyz789"
"550e8400-e29b-41d4-a716-446655440000" // UUID

// SQLite Integer ID (auto-increment)
1
42
1234567890

// Drizzle supports both formats
```

### Date Format Examples
```typescript
// Valid ISO 8601
"2025-01-15T10:30:00Z"
"2025-01-15T10:30:00.123Z"

// Invalid
"01/15/2025"       // Not ISO 8601
"2025-01-15"       // Missing time
```

---

## 🛡️ Security Best Practices

### Authentication
- Always use HTTPS in production
- Session cookies are HttpOnly (not accessible via JavaScript)
- Cookies have SameSite=lax to prevent CSRF
- Sessions expire after 7 days of inactivity
- Logout revokes session server-side

### Authorization
- All mutations check permissions before execution
- Resource ownership verified at database level
- Cascade permissions (project access → video access)
- Soft deletes prevent accidental data loss

### Data Protection
- Passwords hashed with bcrypt (never stored plaintext)
- Sensitive fields excluded from API responses
- Pre-signed URLs expire (1 hour for upload, 24 hours for playback)
- Bunny Stream videos are private by default (token auth available)
- S3 assets are private (no public access)
- Server-side encryption for all stored files

---

## 📚 Domain Documentation

Explore detailed documentation for each API domain:

### Core MVP Domains
- [🔐 Authentication API](./01-authentication) - User registration, login, session management
- [👤 Users API](./02-users) - Profile management, preferences, avatar
- [📁 Projects API](./03-projects) - Project CRUD, organization, settings
- [🎬 Videos API](./04-videos) - **CORE** - Upload (Bunny Stream), playback, metadata
- [💬 Comments API](./05-comments) - **CORE** - Timecode comments, threads, mentions
- [💳 Billing API](./13-billing) - **CRITICAL** - Subscriptions, payments, Polar.sh integration
- [📊 Quota API](./14-quota) - **CRITICAL** - Usage tracking, limit enforcement

### Post-Launch Domains
- [🎨 Annotations API](./06-annotations) - Visual frame annotations
- [🔄 Versions API](./07-versions) - Version control, comparison
- [🔒 Permissions API](./09-permissions) - Access control, sharing
- [🔔 Notifications API](./10-notifications) - Real-time notifications

### Growth Phase Domains
- [👥 Teams API](./08-teams) - Team collaboration
- [📎 Assets API](./11-assets) - Supporting files
- [🎫 Invitations API](./15-invitations) - Team/project invites
- [🔍 Search API](./16-search) - Unified search & discovery
- [🏷️ Tags API](./17-tags) - Custom tags & labels
- [📊 Analytics API](./18-analytics) - Video engagement, team metrics

### Scale Phase Domains
- [🔗 Webhooks API](./12-webhooks) - Integrations
- [🛡️ Compliance API](./19-compliance) - GDPR, SOC2, audit logs

### Extended Domains (Competitive Feature Parity)
- [🔑 Guest Access API](./20-guest-access) - External review links, guest permissions
- [✅ Approvals API](./21-approvals) - Review workflows, approval chains, sign-off management
- [📂 Folders API](./22-folders) - Hierarchical organization within projects
- [📥 Exports API](./23-exports) - Download and export videos, assets, project data
- [🔌 Integrations API](./24-integrations) - Third-party service connections (Slack, Asana, etc.)
- [🎬 Playlists API](./25-playlists) - Video collections and presentations
- [🔀 Comparisons API](./26-comparisons) - Side-by-side version comparison
- [📋 Templates API](./27-templates) - Reusable project, folder, and workflow templates
- [👥 Presence API](./28-presence) - Real-time collaboration, live cursors, sync
- [🤖 AI Features API](./29-ai) - Transcription, scene detection, smart search

---

## 🚀 Getting Started

### 1. Setup Authentication

```typescript
// Sign up
const user = await trpc.auth.signUp.mutate({
  email: "user@example.com",
  password: "SecurePass123!",
  name: "John Doe",
});

// Sign in
const session = await trpc.auth.signIn.mutate({
  email: "user@example.com",
  password: "SecurePass123!",
});

// Session cookie automatically set
```

### 2. Create a Project

```typescript
const project = await trpc.project.create.mutate({
  name: "My First Project",
  description: "Product demo videos",
});
```

### 3. Upload a Video

```typescript
// Request TUS upload endpoint from Bunny Stream
const { video, tusEndpoint, authorizationSignature, libraryId, videoId, expirationTime } = 
  await trpc.video.createUpload.mutate({
    projectId: project.id,
    fileName: "demo.mp4",
    fileSize: file.size,
    title: "Product Demo V1",
  });

// Upload via TUS (resumable)
import * as tus from "tus-js-client";

const upload = new tus.Upload(file, {
  endpoint: tusEndpoint,
  headers: {
    AuthorizationSignature: authorizationSignature,
    AuthorizationExpire: expirationTime.toString(),
    VideoId: videoId,
    LibraryId: libraryId,
  },
  metadata: {
    filetype: file.type,
    title: file.name,
  },
  onSuccess: () => {
    console.log("Upload complete!");
  },
});

upload.start();
```

### 4. Add Comments

```typescript
const comment = await trpc.comment.create.mutate({
  videoId: video.id,
  text: "The logo looks off-center at this timestamp",
  timecode: 45.2, // 45.2 seconds into the video
});
```

---

## 🔄 Changelog

### v1.0.0 (MVP) - TBD
- Initial release with 26 endpoints
- 5 core domains: Auth, Users, Projects, Videos, Comments
- Basic video collaboration workflow

### Future Releases
- v1.1.0 - Post-Launch enhancements
- v2.0.0 - Growth phase (teams, advanced features)
- v3.0.0 - Scale phase (AI, webhooks, enterprise)

---

## 📞 Support

- **Documentation:** [https://docs.koko.dev](https://docs.koko.dev)
- **GitHub Issues:** [Report a bug](https://github.com/koko/koko/issues)
- **Email:** support@koko.dev

---

**Last Updated:** November 26, 2025  
**API Version:** 1.0.0 (MVP)
