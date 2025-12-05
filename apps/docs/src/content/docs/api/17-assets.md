---
title: Assets API
description: File attachments and reference materials - Growth Phase Feature
---

# 📎 Assets API

## Overview

The Assets domain enables **file attachments and reference materials** for projects. Users can upload documents, images, design files, and other reference materials to provide context for video reviews. Includes folder organization, metadata management, and file previews.

**Status:** 🚀 Growth Phase (Month 3-6)

---

## 📌 Quick Reference

### Growth Phase Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `asset.upload` | Mutation | Yes | Upload asset file |
| `asset.getById` | Query | Yes | Get asset details |
| `asset.getAll` | Query | Yes | List project assets |
| `asset.update` | Mutation | Yes | Update asset metadata |
| `asset.delete` | Mutation | Yes | Delete asset |
| `asset.download` | Query | Yes | Get download URL |
| `asset.createFolder` | Mutation | Yes | Create asset folder |
| `asset.move` | Mutation | Yes | Move asset to folder |

### Future Endpoints

#### Scale Phase (Month 6+)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `asset.generatePreview` | Mutation | Yes | Generate thumbnail/preview | High |
| `asset.search` | Query | Yes | Full-text search in assets | Medium |
| `asset.getVersionHistory` | Query | Yes | Get file version history | Medium |
| `asset.createVersion` | Mutation | Yes | Upload new version | Medium |
| `asset.restore` | Mutation | Yes | Restore from trash | Low |

---

## 📦 Data Models

### Asset

```typescript
interface Asset {
  id: string;                      // Asset ID
  projectId: string;               // Parent project
  uploadedBy: string;              // User who uploaded
  
  // File Info
  name: string;                    // Display name
  originalFileName: string;        // Original file name
  fileSize: number;                // Size in bytes
  mimeType: string;                // MIME type (image/png, etc.)
  
  // Storage
  storageKey: string;              // S3/R2 key
  storageUrl: string;              // Public URL (signed)
  
  // Organization
  folderId?: string;               // Parent folder
  description?: string;            // Asset description
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
  deletedAt?: DateTime;            // Soft delete
}
```

### AssetFolder

```typescript
interface AssetFolder {
  id: string;                      // Folder ID
  projectId: string;               // Parent project
  name: string;                    // Folder name
  parentId?: string;               // Parent folder (for nesting)
  createdAt: DateTime;
}
```

### Drizzle Schema

```typescript
// packages/db/src/schema/asset.ts

export const assetFolder = sqliteTable(
  "asset_folder",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    parentId: text("parent_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("asset_folder_project_idx").on(table.projectId),
    index("asset_folder_parent_idx").on(table.parentId),
  ],
);

export const asset = sqliteTable(
  "asset",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    originalFileName: text("original_file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    storageKey: text("storage_key").notNull(),
    storageUrl: text("storage_url").notNull(),
    folderId: text("folder_id").references(() => assetFolder.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("asset_project_idx").on(table.projectId),
    index("asset_uploaded_by_idx").on(table.uploadedBy),
    index("asset_folder_idx").on(table.folderId),
  ],
);
```

---

## 🚀 Growth Phase Endpoints

### 1. asset.upload

**Status:** 🚀 Growth Phase

**Purpose:** Upload a file asset to a project

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must have editor or owner role in project

**Input Schema:**

```typescript
{
  projectId: z.string(),
  file: z.instanceof(File),        // Browser File object
  name: z.string().min(1).max(200).trim().optional(), // Custom name
  folderId: z.string().optional(), // Parent folder
  description: z.string().max(1000).trim().optional(),
}
```

**Response Schema:**

```typescript
{
  asset: Asset & {
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
const file = document.querySelector('input[type="file"]').files[0];

const { asset } = await trpc.asset.upload.mutate({
  projectId: "proj_abc123",
  file: file,
  name: "Design Mockup v3",
  folderId: "folder_xyz789",
  description: "Updated design with new color scheme",
});
```

**Example Response:**

```json
{
  "asset": {
    "id": "asset_abc123",
    "projectId": "proj_abc123",
    "uploadedBy": "user_xyz789",
    "name": "Design Mockup v3",
    "originalFileName": "mockup-v3.png",
    "fileSize": 2458624,
    "mimeType": "image/png",
    "storageKey": "projects/proj_abc123/assets/asset_abc123.png",
    "storageUrl": "https://cdn.koko.com/assets/asset_abc123.png?signature=...",
    "folderId": "folder_xyz789",
    "description": "Updated design with new color scheme",
    "createdAt": "2025-01-15T14:30:00Z",
    "uploader": {
      "id": "user_xyz789",
      "name": "John Doe",
      "image": "https://cdn.koko.com/avatars/john.jpg"
    }
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No editor permission in project
- `NOT_FOUND` - Project or folder does not exist
- `BAD_REQUEST` - Invalid file type or size exceeded
- `PAYLOAD_TOO_LARGE` - File exceeds max size (100MB)

**Business Rules:**

1. Only editors and owners can upload assets
2. File size limit: 100MB (configurable)
3. Allowed MIME types: See [Supported File Types](#supported-file-types)
4. If no name provided, use original filename
5. File uploaded to cloud storage (S3/Cloudflare R2)
6. Storage URL is signed (expires in 7 days)
7. Quota check: Project storage limit

**Database Operations:**

```typescript
// Check project permissions
const membership = await checkProjectPermission(ctx.session.user.id, input.projectId);
if (!["owner", "editor"].includes(membership.role)) {
  throw new TRPCError({ code: "FORBIDDEN" });
}

// Check quota
const project = await db.query.project.findFirst({
  where: eq(project.id, input.projectId),
});

if (project.storageUsed + input.file.size > project.storageQuota) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Storage quota exceeded",
  });
}

// Upload to storage
const storageKey = `projects/${input.projectId}/assets/${assetId}.${ext}`;
const storageUrl = await uploadToStorage({
  key: storageKey,
  file: input.file,
  contentType: input.file.type,
});

// Create asset record
const [asset] = await db.insert(asset).values({
  id: assetId,
  projectId: input.projectId,
  uploadedBy: ctx.session.user.id,
  name: input.name || input.file.name,
  originalFileName: input.file.name,
  fileSize: input.file.size,
  mimeType: input.file.type,
  storageKey,
  storageUrl,
  folderId: input.folderId,
  description: input.description,
}).returning();

// Update project storage
await db.update(project)
  .set({ storageUsed: sql`${project.storageUsed} + ${input.file.size}` })
  .where(eq(project.id, input.projectId));
```

**Side Effects:**

- File uploaded to cloud storage
- Asset record created
- Project storage quota updated
- Activity log entry created

---

### 2. asset.getById

**Status:** 🚀 Growth Phase

**Purpose:** Get asset details with signed download URL

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have access to project

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Response Schema:**

```typescript
{
  asset: Asset & {
    uploader: {
      id: string;
      name: string;
      image?: string;
    };
    folder?: {
      id: string;
      name: string;
    };
    downloadUrl: string; // Fresh signed URL
  };
}
```

**Example Request:**

```typescript
const { asset } = await trpc.asset.getById.query({
  id: "asset_abc123",
});
```

**Example Response:**

```json
{
  "asset": {
    "id": "asset_abc123",
    "name": "Design Mockup v3",
    "originalFileName": "mockup-v3.png",
    "fileSize": 2458624,
    "mimeType": "image/png",
    "description": "Updated design",
    "createdAt": "2025-01-15T14:30:00Z",
    "uploader": {
      "id": "user_xyz789",
      "name": "John Doe"
    },
    "folder": {
      "id": "folder_xyz789",
      "name": "Design Files"
    },
    "downloadUrl": "https://cdn.koko.com/assets/asset_abc123.png?signature=xyz&expires=..."
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No access to project
- `NOT_FOUND` - Asset does not exist

**Business Rules:**

1. Download URL is freshly signed (expires in 1 hour)
2. Deleted assets excluded

---

### 3. asset.getAll

**Status:** 🚀 Growth Phase

**Purpose:** List all assets in a project or folder

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have access to project

**Input Schema:**

```typescript
{
  projectId: z.string(),
  folderId: z.string().optional(),   // Filter by folder (null = root)
  mimeType: z.string().optional(),   // Filter by type (image/*, etc.)
  search: z.string().optional(),     // Search by name
  
  // Pagination
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  assets: Array<Asset & {
    uploader: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  folders: AssetFolder[]; // Folders in current directory
  nextCursor?: string;
  total: number;
}
```

**Example Request:**

```typescript
const { assets, folders } = await trpc.asset.getAll.query({
  projectId: "proj_abc123",
  folderId: "folder_xyz789", // Inside "Design Files" folder
  mimeType: "image/*",       // Images only
});
```

**Example Response:**

```json
{
  "folders": [
    {
      "id": "folder_sub1",
      "name": "Final Versions",
      "projectId": "proj_abc123",
      "parentId": "folder_xyz789"
    }
  ],
  "assets": [
    {
      "id": "asset_abc123",
      "name": "Design Mockup v3",
      "fileSize": 2458624,
      "mimeType": "image/png",
      "createdAt": "2025-01-15T14:30:00Z",
      "uploader": {
        "id": "user_xyz789",
        "name": "John Doe"
      }
    }
  ],
  "total": 42
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No access to project
- `NOT_FOUND` - Project or folder does not exist

**Business Rules:**

1. Returns folders and assets separately
2. Folders sorted alphabetically
3. Assets sorted by createdAt (newest first)
4. Deleted assets excluded
5. Search matches name and description

---

### 4. asset.update

**Status:** 🚀 Growth Phase

**Purpose:** Update asset metadata (name, description)

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be uploader or project owner

**Input Schema:**

```typescript
{
  id: z.string(),
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).trim().optional(),
}
```

**Response Schema:**

```typescript
{
  asset: Asset;
}
```

**Example Request:**

```typescript
const { asset } = await trpc.asset.update.mutate({
  id: "asset_abc123",
  name: "Design Mockup v4 - Final",
  description: "Final approved version with client feedback",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not uploader or project owner
- `NOT_FOUND` - Asset does not exist
- `BAD_REQUEST` - No fields provided

**Business Rules:**

1. Only uploader or project owner can update
2. Cannot change file itself (immutable)
3. At least one field must be provided
4. `updatedAt` timestamp updated

**Database Operations:**

```typescript
// Check permissions
const asset = await db.query.asset.findFirst({
  where: eq(asset.id, input.id),
  with: { project: true },
});

const canUpdate = 
  asset.uploadedBy === ctx.session.user.id ||
  asset.project.ownerId === ctx.session.user.id;

if (!canUpdate) {
  throw new TRPCError({ code: "FORBIDDEN" });
}

// Update metadata
const [updated] = await db.update(asset)
  .set({
    name: input.name,
    description: input.description,
    updatedAt: new Date(),
  })
  .where(eq(asset.id, input.id))
  .returning();
```

---

### 5. asset.delete

**Status:** 🚀 Growth Phase

**Purpose:** Delete an asset (soft delete)

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be uploader or project owner

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
await trpc.asset.delete.mutate({
  id: "asset_abc123",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not uploader or project owner
- `NOT_FOUND` - Asset does not exist

**Business Rules:**

1. Only uploader or project owner can delete
2. Soft delete: Sets `deletedAt` timestamp
3. Hard delete after 30 days (background job)
4. File removed from storage on hard delete
5. Project storage quota updated

**Database Operations:**

```typescript
// Soft delete asset
await db.update(asset)
  .set({ deletedAt: new Date() })
  .where(eq(asset.id, input.id));

// Update project storage (immediately)
const assetData = await db.query.asset.findFirst({
  where: eq(asset.id, input.id),
});

await db.update(project)
  .set({ storageUsed: sql`${project.storageUsed} - ${assetData.fileSize}` })
  .where(eq(project.id, assetData.projectId));

// Schedule storage deletion (background job)
await scheduleStorageDeletion({
  key: assetData.storageKey,
  deleteAt: add(new Date(), { days: 30 }),
});
```

**Side Effects:**

- Asset soft deleted
- Project storage quota updated
- File scheduled for deletion from storage (30 days)
- Activity log entry created

---

### 6. asset.download

**Status:** 🚀 Growth Phase

**Purpose:** Get signed download URL for asset

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have access to project

**Input Schema:**

```typescript
{
  id: z.string(),
  expiresIn: z.number().min(60).max(86400).default(3600), // Seconds
}
```

**Response Schema:**

```typescript
{
  downloadUrl: string;
  expiresAt: DateTime;
}
```

**Example Request:**

```typescript
const { downloadUrl, expiresAt } = await trpc.asset.download.query({
  id: "asset_abc123",
  expiresIn: 3600, // 1 hour
});

// Use download URL
window.open(downloadUrl, '_blank');
```

**Example Response:**

```json
{
  "downloadUrl": "https://cdn.koko.com/assets/asset_abc123.png?signature=xyz&expires=1736956800",
  "expiresAt": "2025-01-15T15:30:00Z"
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No access to project
- `NOT_FOUND` - Asset does not exist

**Business Rules:**

1. URL expires after specified time (default 1 hour)
2. Signature prevents unauthorized access
3. Download tracked for analytics (Scale phase)

---

### 7. asset.createFolder

**Status:** 🚀 Growth Phase

**Purpose:** Create a folder for organizing assets

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must have editor or owner role in project

**Input Schema:**

```typescript
{
  projectId: z.string(),
  name: z.string().min(1).max(100).trim(),
  parentId: z.string().optional(), // Parent folder for nesting
}
```

**Response Schema:**

```typescript
{
  folder: AssetFolder;
}
```

**Example Request:**

```typescript
const { folder } = await trpc.asset.createFolder.mutate({
  projectId: "proj_abc123",
  name: "Design Files",
  parentId: "folder_parent123", // Optional: nest inside another folder
});
```

**Example Response:**

```json
{
  "folder": {
    "id": "folder_xyz789",
    "projectId": "proj_abc123",
    "name": "Design Files",
    "parentId": "folder_parent123",
    "createdAt": "2025-01-15T14:30:00Z"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No editor permission in project
- `NOT_FOUND` - Project or parent folder does not exist
- `CONFLICT` - Folder with same name exists in parent

**Business Rules:**

1. Only editors and owners can create folders
2. Folder names must be unique within parent
3. Supports nested folders (unlimited depth)
4. Empty folders allowed

**Database Operations:**

```typescript
// Check for duplicate name
const existing = await db.query.assetFolder.findFirst({
  where: and(
    eq(assetFolder.projectId, input.projectId),
    eq(assetFolder.parentId, input.parentId ?? null),
    eq(assetFolder.name, input.name)
  ),
});

if (existing) {
  throw new TRPCError({
    code: "CONFLICT",
    message: "Folder with this name already exists",
  });
}

// Create folder
const [folder] = await db.insert(assetFolder).values({
  id: generateId(),
  projectId: input.projectId,
  name: input.name,
  parentId: input.parentId,
}).returning();
```

---

### 8. asset.move

**Status:** 🚀 Growth Phase

**Purpose:** Move asset to different folder

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be uploader or project owner

**Input Schema:**

```typescript
{
  assetId: z.string(),
  folderId: z.string().nullable(), // null = move to root
}
```

**Response Schema:**

```typescript
{
  asset: Asset;
}
```

**Example Request:**

```typescript
const { asset } = await trpc.asset.move.mutate({
  assetId: "asset_abc123",
  folderId: "folder_xyz789", // Or null for root
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not uploader or project owner
- `NOT_FOUND` - Asset or folder does not exist
- `BAD_REQUEST` - Folder belongs to different project

**Business Rules:**

1. Only uploader or project owner can move
2. Can move to root by setting `folderId=null`
3. Folder must belong to same project
4. `updatedAt` timestamp updated

**Database Operations:**

```typescript
// Validate folder belongs to same project
if (input.folderId) {
  const folder = await db.query.assetFolder.findFirst({
    where: eq(assetFolder.id, input.folderId),
  });
  
  const asset = await db.query.asset.findFirst({
    where: eq(asset.id, input.assetId),
  });
  
  if (folder.projectId !== asset.projectId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Folder belongs to different project",
    });
  }
}

// Move asset
const [updated] = await db.update(asset)
  .set({
    folderId: input.folderId,
    updatedAt: new Date(),
  })
  .where(eq(asset.id, input.assetId))
  .returning();
```

---

## 🔮 Future Endpoints

### Scale Phase

#### asset.generatePreview
**Priority:** High  
**Purpose:** Generate thumbnail/preview for images and documents  
**Why Later:** Nice-to-have for visual browsing  
**Complexity:** Medium (image processing)

**Implementation:**
- Auto-generate on upload for images
- Generate 200x200 thumbnail
- Store in separate `thumbnailUrl` field
- Use worker/lambda for processing

---

#### asset.search
**Priority:** Medium  
**Purpose:** Full-text search across asset names, descriptions, and file contents  
**Why Later:** Small asset counts don't need search  
**Complexity:** Complex (search indexing, OCR)

**Example:**
```typescript
const { assets } = await trpc.asset.search.query({
  projectId: "proj_abc123",
  query: "design mockup",
  fileTypes: ["image/png", "application/pdf"],
});
```

---

#### asset.getVersionHistory
**Priority:** Medium  
**Purpose:** View version history for an asset  
**Why Later:** Advanced feature for iterative work  
**Complexity:** Medium (version tracking)

**Use Case:**
- Designer uploads mockup-v1.png
- Later uploads mockup-v2.png to same asset
- Can view and restore previous versions

---

#### asset.createVersion
**Priority:** Medium  
**Purpose:** Upload new version of existing asset  
**Why Later:** Version control is advanced feature  
**Complexity:** Medium (version linking)

**Example:**
```typescript
await trpc.asset.createVersion.mutate({
  assetId: "asset_abc123",
  file: newFile,
  changeDescription: "Updated colors per client feedback",
});
```

---

#### asset.restore
**Priority:** Low  
**Purpose:** Restore soft-deleted asset from trash  
**Why Later:** Edge case, nice-to-have  
**Complexity:** Simple (unset deletedAt)

---

## 📁 Supported File Types

### Documents
- **PDF**: `application/pdf`
- **Word**: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Excel**: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **PowerPoint**: `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- **Text**: `text/plain`, `text/markdown`

### Images
- **PNG**: `image/png`
- **JPEG**: `image/jpeg`
- **GIF**: `image/gif`
- **SVG**: `image/svg+xml`
- **WebP**: `image/webp`

### Design Files
- **Photoshop**: `image/vnd.adobe.photoshop`
- **Illustrator**: `application/postscript`
- **Sketch**: `application/sketch` (actually ZIP)
- **Figma**: Link only (external)

### Archives
- **ZIP**: `application/zip`
- **RAR**: `application/x-rar-compressed`
- **7z**: `application/x-7z-compressed`

### Other
- **JSON**: `application/json`
- **XML**: `application/xml`
- **CSV**: `text/csv`

**Max File Size:** 100MB (configurable per plan)

---

## 🗂️ Folder Structure Example

```
Project: "Product Launch Campaign"
├── 📁 Design Files
│   ├── 📁 Final Versions
│   │   ├── 📄 logo-final.ai (2.3 MB)
│   │   └── 🖼️ hero-image.png (4.1 MB)
│   ├── 📁 Drafts
│   │   ├── 🖼️ mockup-v1.png (2.5 MB)
│   │   └── 🖼️ mockup-v2.png (2.6 MB)
│   └── 📄 brand-guidelines.pdf (1.8 MB)
├── 📁 Scripts
│   ├── 📄 script-v1.docx (45 KB)
│   └── 📄 script-final.docx (52 KB)
├── 📁 Reference
│   ├── 🖼️ competitor-analysis.png (3.2 MB)
│   └── 📄 market-research.pdf (890 KB)
└── 📄 project-brief.pdf (125 KB)
```

---

## 🧪 Testing Scenarios

### Growth Phase Testing
- [ ] Upload asset to project
- [ ] Upload asset exceeding size limit (should fail)
- [ ] Upload unsupported file type (should fail)
- [ ] Get asset details with signed URL
- [ ] List all assets in project
- [ ] List assets in specific folder
- [ ] Filter assets by MIME type
- [ ] Search assets by name
- [ ] Update asset metadata
- [ ] Update asset as non-uploader (should fail)
- [ ] Delete asset
- [ ] Delete asset as non-owner (should fail)
- [ ] Create folder
- [ ] Create duplicate folder name (should fail)
- [ ] Move asset to folder
- [ ] Move asset to folder in different project (should fail)
- [ ] Download asset with signed URL
- [ ] Signed URL expiration

### Edge Cases
- [ ] Upload with very long filename (truncation)
- [ ] Upload with special characters in filename
- [ ] Create nested folders (multiple levels)
- [ ] Delete folder with assets inside
- [ ] Move folder (future feature)
- [ ] Storage quota exceeded (should fail)
- [ ] Concurrent uploads
- [ ] Upload same filename (auto-rename)

---

## 💾 Storage Backend

### Cloudflare R2 (Recommended)

```typescript
// Upload configuration
const storage = new R2Client({
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
});

async function uploadAsset(file: File, key: string) {
  const uploadUrl = await storage.getSignedUploadUrl({
    bucket: "koko-assets",
    key,
    expiresIn: 3600,
  });
  
  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });
  
  return storage.getPublicUrl({ bucket: "koko-assets", key });
}
```

### AWS S3 (Alternative)

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });

await s3.send(new PutObjectCommand({
  Bucket: "koko-assets",
  Key: storageKey,
  Body: file,
  ContentType: file.type,
}));
```

---

## 📊 Storage Quotas

### By Plan

| Plan | Storage Quota | Max File Size |
|------|---------------|---------------|
| Free | 5 GB | 50 MB |
| Pro | 100 GB | 100 MB |
| Business | 500 GB | 500 MB |
| Enterprise | Unlimited | 2 GB |

### Quota Enforcement

```typescript
// Check before upload
const project = await db.query.project.findFirst({
  where: eq(project.id, input.projectId),
});

if (project.storageUsed + file.size > project.storageQuota) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `Storage quota exceeded. Used: ${formatBytes(project.storageUsed)}, Quota: ${formatBytes(project.storageQuota)}`,
  });
}
```

---

## 📚 Related Documentation

- [Projects API](./03-projects) - Parent projects
- [Videos API](./04-videos) - Video attachments vs assets
- [Teams API](./08-teams) - Team-wide assets *(Growth Phase)*
- [Quota API](./14-quota) - Storage quotas and limits

---

## 🔗 External Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/best-practices.html)
- [File Upload Security](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [MIME Type Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)
