---
title: Exports API
description: Download and export videos, assets, and project data
---

# 📥 Exports API

## Overview

The Exports domain handles downloading and exporting videos, assets, comments, and project data. It supports various formats, quality options, and batch operations for efficient content delivery.

---

## 📌 Quick Reference

### Post-Launch Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `export.requestVideoDownload` | Mutation | Yes | Request video download URL |
| `export.getDownloadUrl` | Query | Yes | Get signed download URL |
| `export.getStatus` | Query | Yes | Check export job status |

### Growth Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `export.batchDownload` | Mutation | Yes | Download multiple videos | High |
| `export.exportComments` | Mutation | Yes | Export comments to CSV/PDF | High |
| `export.exportProject` | Mutation | Yes | Export entire project | Medium |
| `export.createPackage` | Mutation | Yes | Create download package | Medium |
| `export.exportAnnotations` | Mutation | Yes | Export annotations data | Low |

### Scale Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `export.scheduleExport` | Mutation | Yes | Schedule recurring exports | Medium |
| `export.exportToCloud` | Mutation | Yes | Export to cloud storage | Medium |
| `export.getHistory` | Query | Yes | Export history log | Low |
| `export.setDefaults` | Mutation | Yes | Set default export settings | Low |

---

## 📦 Data Models

### ExportJob

```typescript
interface ExportJob {
  id: string;                      // Unique identifier
  userId: string;                  // Requesting user
  projectId?: string;              // Associated project
  
  // Job Configuration
  type: ExportType;                // 'video' | 'comments' | 'project' | 'package'
  format: ExportFormat;            // Output format
  quality?: VideoQuality;          // For video exports
  
  // Source Items
  items: Array<{
    type: 'video' | 'asset' | 'folder';
    id: string;
  }>;
  
  // Status
  status: ExportStatus;            // 'pending' | 'processing' | 'completed' | 'failed'
  progress: number;                // 0-100
  error?: string;                  // Error message if failed
  
  // Output
  downloadUrl?: string;            // Signed download URL
  downloadExpiresAt?: DateTime;    // URL expiration
  fileSize?: number;               // Bytes
  fileName: string;                // Output filename
  
  // Timestamps
  createdAt: DateTime;
  startedAt?: DateTime;
  completedAt?: DateTime;
  expiresAt: DateTime;             // Job/file expiration
}

type ExportType = 'video' | 'comments' | 'annotations' | 'project' | 'package';

type ExportFormat = 
  | 'original'        // Original quality
  | 'mp4_1080p'       // Transcoded 1080p
  | 'mp4_720p'        // Transcoded 720p
  | 'mp4_480p'        // Transcoded 480p
  | 'csv'             // Comments/data
  | 'pdf'             // Formatted report
  | 'json'            // Raw data
  | 'zip';            // Package

type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

type VideoQuality = 'original' | '4k' | '1080p' | '720p' | '480p';
```

### Drizzle Schema

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const exportJob = sqliteTable(
  "export_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .references(() => project.id, { onDelete: "set null" }),
    
    type: text("type", { 
      enum: ["video", "comments", "annotations", "project", "package"] 
    }).notNull(),
    format: text("format", { 
      enum: ["original", "mp4_1080p", "mp4_720p", "mp4_480p", "csv", "pdf", "json", "zip"] 
    }).notNull(),
    quality: text("quality", { 
      enum: ["original", "4k", "1080p", "720p", "480p"] 
    }),
    
    items: text("items", { mode: "json" })
      .$type<Array<{ type: string; id: string }>>()
      .notNull(),
    
    status: text("status", { 
      enum: ["pending", "processing", "completed", "failed", "expired"] 
    }).default("pending").notNull(),
    progress: integer("progress").default(0).notNull(),
    error: text("error"),
    
    downloadUrl: text("download_url"),
    downloadExpiresAt: integer("download_expires_at", { mode: "timestamp_ms" }),
    fileSize: integer("file_size"),
    fileName: text("file_name").notNull(),
    
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("export_user_idx").on(table.userId),
    index("export_project_idx").on(table.projectId),
    index("export_status_idx").on(table.status),
  ]
);
```

---

## 🚀 Post-Launch Endpoints

### 1. export.requestVideoDownload

**Status:** 🔄 Post-Launch

**Purpose:** Request a download URL for a video

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must have view access to video

**Input Schema:**

```typescript
{
  videoId: z.string(),
  format: z.enum(['original', 'mp4_1080p', 'mp4_720p', 'mp4_480p']).default('original'),
  quality: z.enum(['original', '4k', '1080p', '720p', '480p']).optional(),
}
```

**Response Schema:**

```typescript
{
  job: ExportJob;
}
```

**Example Request:**

```typescript
const { job } = await trpc.export.requestVideoDownload.mutate({
  videoId: "507f1f77bcf86cd799439011",
  format: "mp4_1080p",
});

// Poll for completion
const status = await trpc.export.getStatus.query({ jobId: job.id });
```

**Example Response:**

```json
{
  "job": {
    "id": "exp_507f1f77bcf86cd799439011",
    "type": "video",
    "format": "mp4_1080p",
    "status": "pending",
    "progress": 0,
    "fileName": "product-demo-1080p.mp4",
    "createdAt": "2025-01-15T10:30:00Z",
    "expiresAt": "2025-01-16T10:30:00Z"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No access to video
- `NOT_FOUND` - Video not found
- `BAD_REQUEST` - Requested quality not available
- `TOO_MANY_REQUESTS` - Export quota exceeded

**Business Rules:**

1. Original format available immediately (signed URL)
2. Transcoded formats may require processing
3. Download URLs expire after 24 hours
4. Export jobs expire after 7 days
5. Rate limited: 10 exports per hour per user

---

### 2. export.getDownloadUrl

**Status:** 🔄 Post-Launch

**Purpose:** Get signed download URL for completed export

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be job owner

**Input Schema:**

```typescript
{
  jobId: z.string(),
}
```

**Response Schema:**

```typescript
{
  url: string;
  expiresAt: DateTime;
  fileName: string;
  fileSize: number;
}
```

**Example Request:**

```typescript
const { url, expiresAt } = await trpc.export.getDownloadUrl.query({
  jobId: "exp_507f1f77bcf86cd799439011",
});

// Trigger download
window.location.href = url;
```

**Example Response:**

```json
{
  "url": "https://cdn.example.com/exports/exp_123.mp4?token=...",
  "expiresAt": "2025-01-16T10:30:00Z",
  "fileName": "product-demo-1080p.mp4",
  "fileSize": 52428800
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not job owner
- `NOT_FOUND` - Job not found
- `BAD_REQUEST` - Job not completed or expired

---

### 3. export.getStatus

**Status:** 🔄 Post-Launch

**Purpose:** Check export job status

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be job owner

**Input Schema:**

```typescript
{
  jobId: z.string(),
}
```

**Response Schema:**

```typescript
{
  job: ExportJob;
}
```

**Example Response:**

```json
{
  "job": {
    "id": "exp_507f1f77bcf86cd799439011",
    "type": "video",
    "status": "processing",
    "progress": 65,
    "fileName": "product-demo-1080p.mp4"
  }
}
```

**Polling Strategy:**

```typescript
async function waitForExport(jobId: string): Promise<ExportJob> {
  let attempts = 0;
  const maxAttempts = 60;
  
  while (attempts < maxAttempts) {
    const { job } = await trpc.export.getStatus.query({ jobId });
    
    if (job.status === 'completed') return job;
    if (job.status === 'failed') throw new Error(job.error);
    
    await sleep(2000); // Poll every 2 seconds
    attempts++;
  }
  
  throw new Error('Export timeout');
}
```

---

## 🔮 Growth Endpoints

### export.batchDownload

**Priority:** High  
**Purpose:** Download multiple videos as a package  
**Complexity:** Complex

**Input:**

```typescript
{
  videoIds: z.array(z.string()).min(1).max(50),
  format: z.enum(['original', 'mp4_1080p', 'mp4_720p']).default('original'),
  includeMetadata: z.boolean().default(false),
}
```

**Response:**

```typescript
{
  job: ExportJob;
  estimatedSize: number;    // Bytes
  estimatedTime: number;    // Seconds
}
```

**Business Rules:**

1. Maximum 50 videos per batch
2. Creates ZIP package
3. Includes manifest.json with metadata if requested
4. Preserves folder structure if videos are in folders

---

### export.exportComments

**Priority:** High  
**Purpose:** Export comments and feedback  
**Complexity:** Medium

**Input:**

```typescript
{
  videoId: z.string().optional(),      // Single video
  projectId: z.string().optional(),    // Entire project
  format: z.enum(['csv', 'pdf', 'json']).default('csv'),
  includeResolved: z.boolean().default(true),
  includeReplies: z.boolean().default(true),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
}
```

**Response:**

```typescript
{
  job: ExportJob;
}
```

**CSV Output Format:**

```csv
Video,Timestamp,Comment,Author,Created,Status,Replies
"Product Demo",00:01:23,"Logo needs update","John Doe",2025-01-15,Resolved,2
"Product Demo",00:02:45,"Audio is too quiet","Jane Smith",2025-01-15,Open,0
```

**PDF Output:**

- Branded header with project/video info
- Comments grouped by video
- Includes thumbnails at comment timestamps
- Author avatars and metadata
- Page numbers and export date

---

### export.exportProject

**Priority:** Medium  
**Purpose:** Export entire project with all data  
**Complexity:** Complex

**Input:**

```typescript
{
  projectId: z.string(),
  include: z.object({
    videos: z.boolean().default(true),
    comments: z.boolean().default(true),
    annotations: z.boolean().default(false),
    approvals: z.boolean().default(false),
  }),
  videoFormat: z.enum(['original', 'mp4_1080p', 'mp4_720p']).default('original'),
}
```

**Response:**

```typescript
{
  job: ExportJob;
  breakdown: {
    videos: number;
    totalSize: number;
    estimatedTime: number;
  };
}
```

**Package Structure:**

```
project-export-2025-01-15.zip
├── manifest.json           # Project metadata
├── videos/
│   ├── folder-1/
│   │   └── video-1.mp4
│   └── video-2.mp4
├── comments/
│   └── comments.csv
├── annotations/
│   └── annotations.json
└── thumbnails/
    ├── video-1-thumb.jpg
    └── video-2-thumb.jpg
```

---

### export.createPackage

**Priority:** Medium  
**Purpose:** Create custom download package  
**Complexity:** Medium

**Input:**

```typescript
{
  name: z.string().max(100),
  items: z.array(z.object({
    type: z.enum(['video', 'folder', 'asset']),
    id: z.string(),
  })).min(1).max(100),
  options: z.object({
    videoFormat: z.enum(['original', 'mp4_1080p', 'mp4_720p']).default('original'),
    includeComments: z.boolean().default(false),
    preserveStructure: z.boolean().default(true),
  }),
}
```

---

### export.exportAnnotations

**Priority:** Low  
**Purpose:** Export annotations and drawings  
**Complexity:** Simple

**Input:**

```typescript
{
  videoId: z.string(),
  format: z.enum(['json', 'svg']).default('json'),
}
```

**JSON Output:**

```json
{
  "videoId": "507f1f77bcf86cd799439011",
  "annotations": [
    {
      "id": "ann_1",
      "timestamp": 5.5,
      "type": "arrow",
      "data": { "x1": 100, "y1": 200, "x2": 300, "y2": 400 },
      "color": "#FF0000",
      "author": "user_123"
    }
  ]
}
```

---

## 🎯 Scale Endpoints

### export.scheduleExport

**Priority:** Medium  
**Purpose:** Schedule recurring exports  
**Complexity:** Medium

**Input:**

```typescript
{
  projectId: z.string(),
  schedule: z.enum(['daily', 'weekly', 'monthly']),
  include: z.object({
    comments: z.boolean().default(true),
    newVideos: z.boolean().default(false),
  }),
  deliveryMethod: z.enum(['email', 'webhook', 'cloud']),
  deliveryConfig: z.object({
    email: z.string().email().optional(),
    webhookUrl: z.string().url().optional(),
    cloudProvider: z.enum(['s3', 'gcs', 'dropbox']).optional(),
  }),
}
```

---

### export.exportToCloud

**Priority:** Medium  
**Purpose:** Export directly to cloud storage  
**Complexity:** Complex

**Input:**

```typescript
{
  jobId: z.string(),                    // Or create new export
  destination: z.object({
    provider: z.enum(['s3', 'gcs', 'dropbox', 'drive']),
    credentials: z.object({
      // Provider-specific credentials
    }),
    path: z.string(),
  }),
}
```

**Supported Providers:**

| Provider | Authentication | Path Format |
|----------|---------------|-------------|
| AWS S3 | Access Key + Secret | `bucket/path/` |
| Google Cloud | Service Account JSON | `bucket/path/` |
| Dropbox | OAuth Token | `/path/` |
| Google Drive | OAuth Token | Folder ID |

---

### export.getHistory

**Priority:** Low  
**Purpose:** Get export history  
**Complexity:** Simple

**Input:**

```typescript
{
  projectId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
}
```

**Response:**

```typescript
{
  exports: Array<ExportJob>;
  nextCursor?: string;
}
```

---

### export.setDefaults

**Priority:** Low  
**Purpose:** Set default export preferences  
**Complexity:** Simple

**Input:**

```typescript
{
  defaults: z.object({
    videoFormat: z.enum(['original', 'mp4_1080p', 'mp4_720p']),
    includeComments: z.boolean(),
    preserveStructure: z.boolean(),
  }),
}
```

---

## 📊 Export Formats

### Video Formats

| Format | Resolution | Codec | Bitrate | Use Case |
|--------|------------|-------|---------|----------|
| original | Source | Source | Source | Archival |
| mp4_1080p | 1920×1080 | H.264 | 8 Mbps | Delivery |
| mp4_720p | 1280×720 | H.264 | 5 Mbps | Web/Mobile |
| mp4_480p | 854×480 | H.264 | 2.5 Mbps | Low bandwidth |

### Data Formats

| Format | MIME Type | Use Case |
|--------|-----------|----------|
| csv | text/csv | Spreadsheet import |
| json | application/json | API/Integration |
| pdf | application/pdf | Reports/Sharing |
| zip | application/zip | Packages |

---

## ⚡ Performance

### Rate Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| Video exports | 10 | 1 hour |
| Batch exports | 3 | 1 hour |
| Project exports | 1 | 1 hour |
| Comment exports | 20 | 1 hour |

### File Size Limits

| Tier | Single Export | Batch Export |
|------|--------------|--------------|
| Free | 2 GB | 5 GB |
| Pro | 10 GB | 50 GB |
| Enterprise | Unlimited | Unlimited |

### Processing Times

| Operation | Estimated Time |
|-----------|----------------|
| Original download | Instant (signed URL) |
| Transcode 1080p | 1-3 min per minute of video |
| Batch (10 videos) | 5-15 minutes |
| Project export | 10-60 minutes |

---

## 🔒 Security

### Signed URLs

- URLs include cryptographic signature
- Expire after 24 hours
- Single-use option available
- IP restriction option (enterprise)

### Access Control

- Export respects video/project permissions
- Guest users can only export if allowed
- Watermarking option for sensitive content
- Audit log for all exports

---

## 🧪 Testing Scenarios

### Post-Launch Testing
- [ ] Request original video download
- [ ] Request transcoded video download
- [ ] Poll for job completion
- [ ] Download completed export
- [ ] Handle expired download URL
- [ ] Handle failed export job
- [ ] Rate limiting enforcement

### Format Testing
- [ ] Export comments as CSV
- [ ] Export comments as PDF
- [ ] Export comments as JSON
- [ ] Export with date range filter
- [ ] Export resolved vs unresolved

### Batch Testing
- [ ] Batch download 5 videos
- [ ] Batch download at limit (50)
- [ ] Batch with mixed folders
- [ ] Cancel batch export

---

## 📚 Related Documentation

- [Videos API](./04-videos) - Video sources
- [Comments API](./05-comments) - Comment data
- [Annotations API](./06-annotations) - Annotation data
- [Quota API](./14-quota) - Export limits

---

## 🔗 External Resources

- [Content-Disposition Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition)
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [ZIP File Format](https://en.wikipedia.org/wiki/ZIP_(file_format))
