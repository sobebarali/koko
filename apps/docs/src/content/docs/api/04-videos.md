---
title: Videos API
description: Video upload, processing, playback via Bunny Stream - Core MVP Feature
---

# 🎬 Videos API

## Overview

The Videos domain is the **core feature** of Artellio. It handles video upload, transcoding, storage, playback, and metadata management using **Bunny Stream** - a managed video platform with automatic transcoding, global CDN delivery, and HLS streaming.

**Video Provider:** [Bunny Stream](https://bunny.net/stream/)

---

## 📌 Quick Reference

### MVP Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `video.createUpload` | Mutation | Yes | Initialize upload & get TUS endpoint |
| `video.getById` | Query | Yes | Get video details |
| `video.getAll` | Query | Yes | List videos in project |
| `video.updateMetadata` | Mutation | Yes | Update title/description/tags |
| `video.delete` | Mutation | Yes | Delete video |
| `video.getPlaybackUrl` | Query | Yes | Get streaming URL |

### Future Endpoints

#### Post-Launch (Month 1-2)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `video.updateThumbnail` | Mutation | Yes | Custom thumbnail | High |
| `video.getProcessingStatus` | Query | Yes | Real-time status | High |
| `video.addCaptions` | Mutation | Yes | Upload subtitles | Medium |
| `video.downloadOriginal` | Query | Yes | Download source | Medium |
| `video.bulkDelete` | Mutation | Yes | Delete multiple | Medium |

#### Growth (Month 3-6)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `video.search` | Query | Yes | Full-text search | High |
| `video.getAnalytics` | Query | Yes | View stats (Bunny) | High |
| `video.getHeatmap` | Query | Yes | Engagement heatmap | Medium |
| `video.reencode` | Mutation | Yes | Change encoding | Low |
| `video.addChapters` | Mutation | Yes | Video chapters | Low |

#### Scale (Month 6+)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `video.transcribe` | Mutation | Yes | AI subtitles (Bunny) | High |
| `video.generateClips` | Mutation | Yes | AI highlights | Medium |
| `video.liveStream` | Mutation | Yes | Live streaming | Low |

---

## 📦 Data Models

### Video

```typescript
interface Video {
  id: string;                      // MongoDB ObjectId
  projectId: string;               // Parent project
  uploadedBy: string;              // User ID
  
  // Bunny Stream Integration
  bunnyVideoId: string;            // Bunny Stream video GUID
  bunnyLibraryId: string;          // Bunny library ID
  bunnyCollectionId?: string;      // Optional collection
  
  // Metadata
  title: string;                   // Video title
  description?: string;            // Optional description
  tags: string[];                  // Searchable tags
  
  // File information
  originalFileName: string;        // Original file name
  fileSize: number;                // Size in bytes
  mimeType: string;                // video/mp4, etc.
  duration: number;                // Duration in seconds
  
  // Video properties (populated by Bunny)
  width: number;                   // Resolution width
  height: number;                  // Resolution height
  fps: number;                     // Frames per second
  
  // Processing status
  status: VideoStatus;             // Current state
  processingProgress?: number;     // 0-100 percentage (from Bunny)
  errorMessage?: string;           // Error if failed
  
  // URLs (from Bunny Stream)
  streamingUrl?: string;           // HLS playlist URL
  thumbnailUrl?: string;           // Thumbnail URL
  iframeUrl?: string;              // Embeddable player URL
  
  // Engagement
  viewCount: number;               // Total views
  commentCount: number;            // Total comments
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
  deletedAt?: DateTime;
}

enum VideoStatus {
  UPLOADING = "uploading",         // Being uploaded (TUS)
  PROCESSING = "processing",        // Bunny transcoding
  READY = "ready",                 // Ready for playback
  FAILED = "failed"                // Processing failed
}
```

### Prisma Schema

```prisma
model Video {
  id        String      @id @default(auto()) @map("_id") @db.ObjectId
  projectId String      @db.ObjectId
  uploadedBy String     @db.ObjectId
  
  // Bunny Stream
  bunnyVideoId     String  @unique
  bunnyLibraryId   String
  bunnyCollectionId String?
  
  title       String
  description String?
  tags        String[]
  
  originalFileName String
  fileSize         Int
  mimeType         String
  duration         Float    @default(0)
  
  width    Int      @default(0)
  height   Int      @default(0)
  fps      Float    @default(0)
  
  status             VideoStatus @default(UPLOADING)
  processingProgress Int?
  errorMessage       String?
  
  streamingUrl String?
  thumbnailUrl String?
  iframeUrl    String?
  
  viewCount    Int @default(0)
  commentCount Int @default(0)
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  
  // Relations
  project  Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  uploader User      @relation(fields: [uploadedBy], references: [id])
  comments Comment[]
  
  @@index([projectId])
  @@index([uploadedBy])
  @@index([status])
  @@index([bunnyVideoId])
  @@index([createdAt(sort: Desc)])
  @@map("video")
}

enum VideoStatus {
  UPLOADING
  PROCESSING
  READY
  FAILED
}
```

---

## 🚀 MVP Endpoints

### 1. video.createUpload

**Status:** ✅ MVP

**Purpose:** Initialize video upload using Bunny Stream's TUS resumable upload

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project member with upload permission (owner/editor)

**Input Schema:**

```typescript
{
  projectId: z.string(),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().max(5_000_000_000), // 5GB max
  mimeType: z.enum([
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    'video/x-matroska',
    'video/avi',
  ]),
  
  // Optional metadata
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
}
```

**Response Schema:**

```typescript
{
  video: Video;                    // Created video record
  uploadUrl: string;               // Bunny TUS endpoint
  uploadHeaders: {                 // Required headers for TUS upload
    AuthorizationSignature: string;
    AuthorizationExpire: string;
    VideoId: string;
    LibraryId: string;
  };
}
```

**Example Request:**

```typescript
// Step 1: Initialize upload with Artellio API
const result = await trpc.video.createUpload.mutate({
  projectId: "507f1f77bcf86cd799439011",
  fileName: "demo-v1.mp4",
  fileSize: 150000000, // 150MB
  mimeType: "video/mp4",
  title: "Product Demo V1",
  description: "First version of demo",
  tags: ["demo", "v1"],
});

// Step 2: Upload using TUS client to Bunny Stream
import * as tus from 'tus-js-client';

const upload = new tus.Upload(videoFile, {
  endpoint: result.uploadUrl,
  retryDelays: [0, 3000, 5000, 10000, 20000],
  headers: result.uploadHeaders,
  metadata: {
    filetype: videoFile.type,
    title: result.video.title,
  },
  onError: (error) => {
    console.error('Upload failed:', error);
  },
  onProgress: (bytesUploaded, bytesTotal) => {
    const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
    console.log(`Uploaded ${percentage}%`);
  },
  onSuccess: () => {
    console.log('Upload complete! Processing started automatically.');
  },
});

// Start upload (resumable)
upload.start();
```

**Example Response:**

```json
{
  "video": {
    "id": "507f1f77bcf86cd799439012",
    "projectId": "507f1f77bcf86cd799439011",
    "uploadedBy": "507f1f77bcf86cd799439010",
    "bunnyVideoId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
    "bunnyLibraryId": "12345",
    "title": "Product Demo V1",
    "description": "First version of demo",
    "tags": ["demo", "v1"],
    "originalFileName": "demo-v1.mp4",
    "fileSize": 150000000,
    "mimeType": "video/mp4",
    "status": "uploading",
    "viewCount": 0,
    "commentCount": 0,
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "uploadUrl": "https://video.bunnycdn.com/tusupload",
  "uploadHeaders": {
    "AuthorizationSignature": "sha256_signature_here",
    "AuthorizationExpire": "1737028200",
    "VideoId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
    "LibraryId": "12345"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not a project member or no upload permission
- `BAD_REQUEST` - Invalid file type or size exceeds limit
- `NOT_FOUND` - Project does not exist
- `CONFLICT` - Project storage quota exceeded
- `TOO_MANY_REQUESTS` - Upload rate limit (10/hour)
- `INTERNAL_SERVER_ERROR` - Bunny API error

**Business Rules:**

1. File size must not exceed 5GB (Bunny library setting)
2. Only specific video MIME types allowed
3. Project must exist and user must have upload permission
4. Title defaults to fileName if not provided
5. Upload quota checked before creating video
6. Video record created in MongoDB with status `UPLOADING`
7. Bunny video created via `/library/{libraryId}/videos` API
8. TUS signature generated using: `sha256(libraryId + apiKey + expirationTime + videoId)`
9. Signature expires in 24 hours

**Upload Flow (TUS Resumable):**

```
1. Client → Artellio API: video.createUpload
2. Artellio → Bunny API: POST /library/{id}/videos (create video object)
3. Artellio → MongoDB: Create video record (status: UPLOADING)
4. Artellio → Client: TUS endpoint + signed headers
5. Client → Bunny TUS: Upload video chunks (resumable)
6. Bunny → Bunny: Automatic transcoding starts
7. Bunny Webhook → Artellio: video.encoded event
8. Artellio → MongoDB: Update status to READY, save URLs
9. Artellio → WebSocket: Notify client (optional)
```

**Processing States (Bunny Managed):**

```
UPLOADING (0-20%)    → TUS upload in progress
PROCESSING (20-90%)  → Bunny transcoding
  ├─ Validating (20-30%)       → File integrity check
  ├─ Transcoding (30-80%)      → Generate multi-bitrate HLS
  └─ Thumbnails (80-90%)       → Auto-generate thumbnails
READY (100%)         → Available for streaming
FAILED               → Bunny processing error
```

**Bunny Stream Benefits:**

- ✅ **Resumable Uploads** - TUS protocol handles network interruptions
- ✅ **Automatic Transcoding** - Multi-bitrate HLS (240p→4K)
- ✅ **Global CDN** - Low-latency delivery worldwide
- ✅ **Adaptive Bitrate** - Automatic quality switching
- ✅ **Auto Thumbnails** - Generated at multiple timestamps
- ✅ **DRM Support** - Content protection (future)
- ✅ **Analytics** - Built-in view tracking

**Side Effects:**

- Video record created in MongoDB
- Bunny video object created via API
- TUS upload signature generated (expires 24h)
- Project's `videoCount` incremented
- Notification sent to project watchers (if enabled)

---

### 2. video.getById

**Status:** ✅ MVP

**Purpose:** Get detailed video information

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have view access to project

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Response Schema:**

```typescript
{
  video: Video & {
    project: {
      id: string;
      name: string;
    };
    uploader: {
      id: string;
      name: string;
      image?: string;
    };
  };
}
```

**Example Request:**

```typescript
const { video } = await trpc.video.getById.query({
  id: "507f1f77bcf86cd799439012",
});
```

**Example Response:**

```json
{
  "video": {
    "id": "507f1f77bcf86cd799439012",
    "bunnyVideoId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
    "title": "Product Demo V1",
    "status": "ready",
    "duration": 125.5,
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "streamingUrl": "https://vz-12345.b-cdn.net/a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6/playlist.m3u8",
    "thumbnailUrl": "https://vz-12345.b-cdn.net/a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6/thumbnail.jpg",
    "iframeUrl": "https://iframe.mediadelivery.net/embed/12345/a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
    "viewCount": 42,
    "commentCount": 7,
    "project": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Product Demo Project"
    },
    "uploader": {
      "id": "507f1f77bcf86cd799439010",
      "name": "John Doe",
      "image": "https://..."
    }
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No access to project
- `NOT_FOUND` - Video does not exist

**Business Rules:**

1. User must have view access to parent project
2. Increment view count (throttled: once per user per 24h)
3. Return related project and uploader info
4. Bunny URLs are pulled from MongoDB (synced via webhooks)

---

### 3. video.getAll

**Status:** ✅ MVP

**Purpose:** List all videos in a project

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have view access to project

**Input Schema:**

```typescript
{
  projectId: z.string(),
  
  // Pagination
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  
  // Filtering
  status: z.enum(['uploading', 'processing', 'ready', 'failed']).optional(),
  tags: z.array(z.string()).optional(),
  
  // Sorting
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'duration', 'viewCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}
```

**Response Schema:**

```typescript
{
  videos: Video[];
  nextCursor?: string;
  total: number;
}
```

**Example Request:**

```typescript
const { videos, nextCursor, total } = await trpc.video.getAll.query({
  projectId: "507f1f77bcf86cd799439011",
  limit: 20,
  status: "ready",
  sortBy: "createdAt",
  sortOrder: "desc",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No access to project
- `NOT_FOUND` - Project does not exist

---

### 4. video.updateMetadata

**Status:** ✅ MVP

**Purpose:** Update video title, description, and tags

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner or editor

**Input Schema:**

```typescript
{
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
}
```

**Response Schema:**

```typescript
{
  video: Video;
}
```

**Example Request:**

```typescript
const { video } = await trpc.video.updateMetadata.mutate({
  id: "507f1f77bcf86cd799439012",
  title: "Product Demo V1 - Updated",
  tags: ["demo", "product", "v1", "featured"],
});
```

**Implementation Notes:**

- Updates MongoDB record
- Optionally sync title to Bunny via `POST /library/{id}/videos/{videoId}` (not required for MVP)

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not owner/editor
- `NOT_FOUND` - Video does not exist

---

### 5. video.delete

**Status:** ✅ MVP

**Purpose:** Delete a video (soft delete in MongoDB, hard delete from Bunny after 30 days)

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner or video uploader

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
await trpc.video.delete.mutate({
  id: "507f1f77bcf86cd799439012",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not owner/uploader
- `NOT_FOUND` - Video does not exist

**Business Rules:**

1. **Soft delete:** Mark `deletedAt` timestamp in MongoDB
2. **Hard delete after 30 days:** Background job calls `DELETE /library/{id}/videos/{videoId}` on Bunny
3. **Cascade delete:** Comments, annotations, versions (in MongoDB)
4. **Decrement:** Project video count

**Implementation:**

```typescript
// Soft delete
await db.video.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// Background job (runs daily)
const deletedVideos = await db.video.findMany({
  where: {
    deletedAt: { lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  },
});

for (const video of deletedVideos) {
  // Delete from Bunny Stream
  await bunnyApi.deleteVideo(video.bunnyLibraryId, video.bunnyVideoId);
  
  // Delete from MongoDB
  await db.video.delete({ where: { id: video.id } });
}
```

---

### 6. video.getPlaybackUrl

**Status:** ✅ MVP

**Purpose:** Get authenticated streaming URL for video playback

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have view access to project

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Response Schema:**

```typescript
{
  streamingUrl: string;            // HLS playlist URL
  thumbnailUrl: string;
  iframeUrl: string;               // Embeddable player URL
  availableQualities: string[];    // ['240p', '360p', '720p', '1080p']
}
```

**Example Request:**

```typescript
const { streamingUrl, iframeUrl } = await trpc.video.getPlaybackUrl.query({
  id: "507f1f77bcf86cd799439012",
});

// Option 1: Use with HLS player (video.js, hls.js)
<video>
  <source src={streamingUrl} type="application/x-mpegURL" />
</video>

// Option 2: Use Bunny's embeddable player
<iframe src={iframeUrl} allowfullscreen />
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No access to project
- `NOT_FOUND` - Video does not exist
- `PRECONDITION_FAILED` - Video not ready (still processing)

**Business Rules:**

- Bunny Stream URLs are **public by default** (library can be configured for signed URLs)
- For MVP, rely on Artellio's permission checking before returning URL
- Adaptive HLS automatically selects quality based on bandwidth
- CDN-delivered for low latency worldwide

**Bunny Stream URL Format:**

```
Streaming URL (HLS):
https://vz-{libraryId}.b-cdn.net/{videoId}/playlist.m3u8

Thumbnail:
https://vz-{libraryId}.b-cdn.net/{videoId}/thumbnail.jpg

Embeddable Player:
https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
```

---

## 🔮 Future Endpoints

### Post-Launch

#### video.updateThumbnail
**Priority:** High  
**Purpose:** Upload custom thumbnail using Bunny Stream API  
**Implementation:** `POST /library/{id}/videos/{videoId}/thumbnail`  
**Why Later:** Auto-generated sufficient for MVP  

---

#### video.addCaptions
**Priority:** Medium  
**Purpose:** Upload SRT/VTT subtitles via Bunny API  
**Implementation:** `POST /library/{id}/videos/{videoId}/captions/{srclang}`  
**Why Later:** Not critical for internal team use  

---

#### video.getProcessingStatus
**Priority:** High  
**Purpose:** Real-time processing status via Bunny webhooks  
**Implementation:** Poll Bunny API or use WebSocket subscriptions  
**Why Later:** MVP can poll getById  

**Response:**
```typescript
{
  status: VideoStatus,
  progress: number, // 0-100 from Bunny
  stage: 'uploading' | 'validating' | 'transcoding' | 'thumbnails' | 'ready',
  eta: number, // Estimated seconds remaining
}
```

---

### Growth Phase

#### video.getAnalytics
**Priority:** High  
**Purpose:** View statistics from Bunny Stream  
**Implementation:** `GET /library/{id}/videos/{videoId}/statistics`  
**Data Available:**
- View count
- Watch time
- Geographic distribution
- Viewer engagement (heatmap)

---

#### video.getHeatmap
**Priority:** Medium  
**Purpose:** Engagement heatmap showing most-watched segments  
**Implementation:** `GET /library/{id}/videos/{videoId}/heatmap`  

---

### Scale Phase

#### video.transcribe
**Priority:** High  
**Purpose:** Auto-generate subtitles using Bunny's AI transcription  
**Implementation:** `POST /library/{id}/videos/{videoId}/transcribe`  
**Cost:** Pay-per-minute transcription  

---

## 💾 Bunny Stream Architecture

### Video Storage
Bunny Stream handles all storage automatically:
```
Bunny Stream Library {libraryId}/
├── {videoId}/
│   ├── Original video (stored indefinitely)
│   ├── HLS segments (multi-bitrate)
│   │   ├── 240p/
│   │   ├── 360p/
│   │   ├── 720p/
│   │   ├── 1080p/
│   │   └── 1440p/4K (if available)
│   ├── Thumbnails (auto-generated at multiple timestamps)
│   └── Metadata
```

### Retention Policy
- **Original files:** Retained by Bunny indefinitely
- **Transcoded segments:** Auto-managed by Bunny
- **Deleted videos:** Removed from Bunny immediately (30-day grace in MongoDB only)

---

## 🔒 Security Considerations

1. **Upload Security:**
   - TUS signature expires in 24 hours
   - File type validation on client + Bunny
   - Bunny handles virus scanning automatically
   - Rate limiting: 10 uploads/hour/user

2. **Playback Security:**
   - Permission checked in Artellio API before returning URL
   - Optional: Enable Bunny token authentication for URLs
   - Optional: Geographic restrictions in Bunny library settings

3. **API Security:**
   - Bunny API key stored in environment variables
   - Never exposed to frontend
   - Library-level permissions configured in Bunny dashboard

---

## 🌐 Bunny Stream Configuration

### Library Settings (Bunny Dashboard)

1. **Storage Region:** Select closest to users
2. **Allowed Referrers:** Restrict to `artellio.com` domain
3. **Player Customization:** Branding, colors, controls
4. **Security:**
   - Enable/disable token authentication
   - Block/allow geographic regions
   - Watermark (optional)

### Webhook Configuration

Set up webhooks in Bunny Stream to notify Artellio when:
- Video encoding completes → Update status to `READY`
- Video fails → Update status to `FAILED` with error
- Thumbnail generated → Save `thumbnailUrl`

**Webhook URL:** `https://api.artellio.com/webhooks/bunny`

**Webhook Events:**
- `video.encoded` - Transcoding complete
- `video.uploaded` - Upload complete
- `video.failed` - Processing failed

---

## 📚 Related Documentation

- [Bunny Stream API](https://docs.bunny.net/reference/stream-api-overview)
- [TUS Resumable Uploads](https://docs.bunny.net/reference/tus-resumable-uploads)
- [Comments API](./05-comments) - Timecode comments
- [Projects API](./03-projects) - Parent container
- [Annotations API](./06-annotations) - Visual annotations

---

## 🧪 Testing Checklist

- [ ] Upload video < 100MB via TUS
- [ ] Upload video > 1GB (test resumability)
- [ ] Upload exceeds quota
- [ ] Upload unsupported format
- [ ] Check processing status
- [ ] Play video after ready (HLS + iframe)
- [ ] Update metadata
- [ ] Delete video (soft delete)
- [ ] Permission checks (upload, view, delete)
- [ ] Webhook processing (encoding complete)
- [ ] View count tracking
