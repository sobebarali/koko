---
title: Versions API
description: Video version control, comparison, and iterative revision management
---

# 🔄 Versions API

## Overview

The Versions API enables iterative creative workflows by allowing multiple versions of the same video to coexist within a project. Users can upload revisions, compare versions side-by-side, switch between versions, and track the evolution of their content.

**Key Capabilities:**
- Upload new versions of existing videos
- Track version history with metadata
- Compare versions side-by-side (sync playback)
- Set active/current version for viewing
- Restore previous versions
- Transfer comments between versions
- Version-specific annotations

**Status:** 🔄 Post-Launch (Month 1-2)

---

## Data Models

### Core Interfaces

```typescript
// Version status
type VersionStatus = 
  | "uploading"     // Upload in progress
  | "processing"    // Transcoding
  | "ready"         // Available for playback
  | "failed"        // Processing failed
  | "archived";     // Archived (not deleted)

// Version metadata
interface VersionMetadata {
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  codec: string;
  bitrate: number;
}

// Main version interface
interface Version {
  id: string;
  videoId: string;              // Parent video
  versionNumber: number;        // 1, 2, 3, etc.
  label?: string;               // "Final Cut", "Client Revisions", etc.
  description?: string;         // Change notes
  status: VersionStatus;
  
  // File info
  sourceUrl: string;            // Original upload URL
  playbackUrl?: string;         // HLS/DASH streaming URL
  thumbnailUrl?: string;
  metadata?: VersionMetadata;
  
  // Relationships
  createdBy: string;
  isActive: boolean;            // Current active version
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

// Version comparison session
interface VersionComparison {
  id: string;
  videoId: string;
  leftVersionId: string;
  rightVersionId: string;
  syncMode: "timecode" | "independent";
  currentTimecode: number;
  createdBy: string;
  createdAt: Date;
}

// Comment migration between versions
interface CommentMigration {
  id: string;
  sourceVersionId: string;
  targetVersionId: string;
  commentIds: string[];
  status: "pending" | "completed" | "partial";
  migratedCount: number;
  skippedCount: number;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

// Version difference analysis
interface VersionDiff {
  leftVersionId: string;
  rightVersionId: string;
  durationDiff: number;           // Seconds difference
  changes: VersionChange[];
  similarity: number;             // 0-100%
}

interface VersionChange {
  type: "added" | "removed" | "modified";
  timecodeStart: number;
  timecodeEnd: number;
  description?: string;           // AI-generated description
}
```

### API Response Types

```typescript
interface VersionResponse {
  version: Version;
}

interface VersionListResponse {
  versions: Version[];
  activeVersion: Version | null;
  total: number;
}

interface VersionUploadResponse {
  version: Version;
  uploadUrl: string;
  uploadId: string;
  expiresAt: Date;
}

interface ComparisonResponse {
  comparison: VersionComparison;
  leftVersion: Version;
  rightVersion: Version;
}

interface VersionDiffResponse {
  diff: VersionDiff;
  analysisComplete: boolean;
}

interface CommentMigrationResponse {
  migration: CommentMigration;
  migratedComments: string[];
  skippedComments: { id: string; reason: string }[];
}
```

---

## Database Schema

### Drizzle Schema Definition

```typescript
// packages/db/src/schema/version.ts
import { sqliteTable, text, integer, real, index, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { video } from "./video";
import { user } from "./auth";

// Version status enum
export const versionStatusEnum = [
  "uploading",
  "processing",
  "ready",
  "failed",
  "archived",
] as const;

// Main versions table
export const version = sqliteTable(
  "version",
  {
    id: text("id").primaryKey(),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    
    // Version info
    versionNumber: integer("version_number").notNull(),
    label: text("label"),
    description: text("description"),
    status: text("status", { enum: versionStatusEnum }).default("uploading").notNull(),
    
    // File info
    sourceUrl: text("source_url").notNull(),
    playbackUrl: text("playback_url"),
    thumbnailUrl: text("thumbnail_url"),
    
    // Metadata (JSON)
    metadata: text("metadata", { mode: "json" }).$type<VersionMetadata>(),
    
    // Processing
    processingJobId: text("processing_job_id"),
    processingError: text("processing_error"),
    
    // Relationships
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
    
    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("version_video_idx").on(t.videoId),
    index("version_video_number_idx").on(t.videoId, t.versionNumber),
    index("version_status_idx").on(t.status),
    index("version_active_idx").on(t.videoId, t.isActive),
    unique("version_video_number_unique").on(t.videoId, t.versionNumber),
  ]
);

// Version comparisons
export const versionComparison = sqliteTable(
  "version_comparison",
  {
    id: text("id").primaryKey(),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    leftVersionId: text("left_version_id")
      .notNull()
      .references(() => version.id, { onDelete: "cascade" }),
    rightVersionId: text("right_version_id")
      .notNull()
      .references(() => version.id, { onDelete: "cascade" }),
    syncMode: text("sync_mode", { enum: ["timecode", "independent"] }).default("timecode").notNull(),
    currentTimecode: integer("current_timecode").default(0).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("version_comparison_video_idx").on(t.videoId),
    index("version_comparison_user_idx").on(t.createdBy),
  ]
);

// Comment migrations between versions
export const commentMigration = sqliteTable(
  "comment_migration",
  {
    id: text("id").primaryKey(),
    sourceVersionId: text("source_version_id")
      .notNull()
      .references(() => version.id, { onDelete: "cascade" }),
    targetVersionId: text("target_version_id")
      .notNull()
      .references(() => version.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "completed", "partial"] }).default("pending").notNull(),
    migratedCount: integer("migrated_count").default(0).notNull(),
    skippedCount: integer("skipped_count").default(0).notNull(),
    // JSON array of comment IDs
    commentIds: text("comment_ids", { mode: "json" }).$type<string[]>().notNull(),
    skippedReasons: text("skipped_reasons", { mode: "json" }).$type<{ id: string; reason: string }[]>(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("comment_migration_source_idx").on(t.sourceVersionId),
    index("comment_migration_target_idx").on(t.targetVersionId),
  ]
);

// Version diff analysis cache
export const versionDiff = sqliteTable(
  "version_diff",
  {
    id: text("id").primaryKey(),
    leftVersionId: text("left_version_id")
      .notNull()
      .references(() => version.id, { onDelete: "cascade" }),
    rightVersionId: text("right_version_id")
      .notNull()
      .references(() => version.id, { onDelete: "cascade" }),
    durationDiff: real("duration_diff").notNull(),
    similarity: real("similarity").notNull(),
    changes: text("changes", { mode: "json" }).$type<VersionChange[]>().notNull(),
    analysisComplete: integer("analysis_complete", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("version_diff_versions_idx").on(t.leftVersionId, t.rightVersionId),
    unique("version_diff_pair_unique").on(t.leftVersionId, t.rightVersionId),
  ]
);
```

### Relations

```typescript
// packages/db/src/schema/version.ts (continued)
import { relations } from "drizzle-orm";

export const versionRelations = relations(version, ({ one, many }) => ({
  video: one(video, {
    fields: [version.videoId],
    references: [video.id],
  }),
  creator: one(user, {
    fields: [version.createdBy],
    references: [user.id],
  }),
  leftComparisons: many(versionComparison, { relationName: "leftVersion" }),
  rightComparisons: many(versionComparison, { relationName: "rightVersion" }),
  sourceMigrations: many(commentMigration, { relationName: "sourceVersion" }),
  targetMigrations: many(commentMigration, { relationName: "targetVersion" }),
}));

export const versionComparisonRelations = relations(versionComparison, ({ one }) => ({
  video: one(video, {
    fields: [versionComparison.videoId],
    references: [video.id],
  }),
  leftVersion: one(version, {
    fields: [versionComparison.leftVersionId],
    references: [version.id],
    relationName: "leftVersion",
  }),
  rightVersion: one(version, {
    fields: [versionComparison.rightVersionId],
    references: [version.id],
    relationName: "rightVersion",
  }),
  creator: one(user, {
    fields: [versionComparison.createdBy],
    references: [user.id],
  }),
}));

export const commentMigrationRelations = relations(commentMigration, ({ one }) => ({
  sourceVersion: one(version, {
    fields: [commentMigration.sourceVersionId],
    references: [version.id],
    relationName: "sourceVersion",
  }),
  targetVersion: one(version, {
    fields: [commentMigration.targetVersionId],
    references: [version.id],
    relationName: "targetVersion",
  }),
  creator: one(user, {
    fields: [commentMigration.createdBy],
    references: [user.id],
  }),
}));

export const versionDiffRelations = relations(versionDiff, ({ one }) => ({
  leftVersion: one(version, {
    fields: [versionDiff.leftVersionId],
    references: [version.id],
  }),
  rightVersion: one(version, {
    fields: [versionDiff.rightVersionId],
    references: [version.id],
  }),
}));
```

---

## API Endpoints

### Post-Launch Phase (Month 1-2)

#### version.upload

Initiates upload for a new version of an existing video.

```typescript
// Input
interface UploadVersionInput {
  videoId: string;
  label?: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// Example
const { version, uploadUrl, uploadId } = await trpc.version.upload.mutate({
  videoId: "video_abc123",
  label: "V2 - Client Revisions",
  description: "Updated intro sequence and color grading",
  fileName: "project_v2.mp4",
  fileSize: 1024000000,
  mimeType: "video/mp4",
});

// Then upload file to uploadUrl
```

#### version.confirmUpload

Confirms upload completion and triggers processing.

```typescript
// Input
interface ConfirmUploadInput {
  versionId: string;
  uploadId: string;
}

// Example
await trpc.version.confirmUpload.mutate({
  versionId: "ver_xyz789",
  uploadId: "upload_123",
});
```

#### version.getAll

Lists all versions of a video.

```typescript
// Input
interface GetVersionsInput {
  videoId: string;
  includeArchived?: boolean;
}

// Example
const { versions, activeVersion, total } = await trpc.version.getAll.query({
  videoId: "video_abc123",
});
```

#### version.getById

Gets a specific version by ID.

```typescript
// Input
interface GetVersionInput {
  id: string;
}

// Example
const { version } = await trpc.version.getById.query({
  id: "ver_xyz789",
});
```

#### version.setActive

Sets a version as the active/current version.

```typescript
// Input
interface SetActiveInput {
  id: string;
}

// Example
await trpc.version.setActive.mutate({
  id: "ver_xyz789",
});
```

#### version.update

Updates version metadata (label, description).

```typescript
// Input
interface UpdateVersionInput {
  id: string;
  label?: string;
  description?: string;
}

// Example
await trpc.version.update.mutate({
  id: "ver_xyz789",
  label: "Final Approved",
  description: "Client approved on 2024-01-15",
});
```

#### version.archive

Archives a version (soft delete).

```typescript
// Input
interface ArchiveVersionInput {
  id: string;
}

// Example
await trpc.version.archive.mutate({
  id: "ver_xyz789",
});
```

#### version.restore

Restores an archived version.

```typescript
// Input
interface RestoreVersionInput {
  id: string;
  setAsActive?: boolean;
}

// Example
await trpc.version.restore.mutate({
  id: "ver_xyz789",
  setAsActive: true,
});
```

#### version.delete

Permanently deletes a version.

```typescript
// Input
interface DeleteVersionInput {
  id: string;
}

// Example
await trpc.version.delete.mutate({
  id: "ver_xyz789",
});
```

### Growth Phase (Month 3-6)

#### version.compare

Creates a comparison session between two versions.

```typescript
// Input
interface CompareVersionsInput {
  videoId: string;
  leftVersionId: string;
  rightVersionId: string;
  syncMode?: "timecode" | "independent";
}

// Example
const { comparison, leftVersion, rightVersion } = await trpc.version.compare.mutate({
  videoId: "video_abc123",
  leftVersionId: "ver_v1",
  rightVersionId: "ver_v2",
  syncMode: "timecode",
});
```

#### version.updateComparison

Updates comparison session state.

```typescript
// Input
interface UpdateComparisonInput {
  comparisonId: string;
  syncMode?: "timecode" | "independent";
  currentTimecode?: number;
}

// Example
await trpc.version.updateComparison.mutate({
  comparisonId: "cmp_123",
  currentTimecode: 15000,
});
```

#### version.getDiff

Analyzes differences between two versions.

```typescript
// Input
interface GetDiffInput {
  leftVersionId: string;
  rightVersionId: string;
}

// Example
const { diff, analysisComplete } = await trpc.version.getDiff.query({
  leftVersionId: "ver_v1",
  rightVersionId: "ver_v2",
});
// Returns: { durationDiff, similarity, changes: [...] }
```

#### version.migrateComments

Migrates comments from one version to another.

```typescript
// Input
interface MigrateCommentsInput {
  sourceVersionId: string;
  targetVersionId: string;
  commentIds?: string[];     // Specific comments (or all if omitted)
  adjustTimecodes?: boolean; // Attempt to adjust for duration differences
}

// Example
const { migration, migratedComments, skippedComments } = await trpc.version.migrateComments.mutate({
  sourceVersionId: "ver_v1",
  targetVersionId: "ver_v2",
  adjustTimecodes: true,
});
```

#### version.copyAnnotations

Copies annotations from one version to another.

```typescript
// Input
interface CopyAnnotationsInput {
  sourceVersionId: string;
  targetVersionId: string;
  annotationIds?: string[];
  adjustTimecodes?: boolean;
}

// Example
await trpc.version.copyAnnotations.mutate({
  sourceVersionId: "ver_v1",
  targetVersionId: "ver_v2",
});
```

### Scale Phase (Month 6+)

#### version.getTimeline

Gets complete version timeline with all changes.

```typescript
// Input
interface GetTimelineInput {
  videoId: string;
}

// Example
const timeline = await trpc.version.getTimeline.query({
  videoId: "video_abc123",
});
// Returns: versions with comments, annotations, changes for each
```

#### version.analyzeChanges

AI-powered analysis of changes between versions.

```typescript
// Input
interface AnalyzeChangesInput {
  leftVersionId: string;
  rightVersionId: string;
}

// Example
const analysis = await trpc.version.analyzeChanges.query({
  leftVersionId: "ver_v1",
  rightVersionId: "ver_v2",
});
// Returns: AI-generated summary of visual/audio changes
```

#### version.createFromTimecode

Creates a new version from a specific timecode range.

```typescript
// Input
interface CreateFromTimecodeInput {
  sourceVersionId: string;
  startTimecode: number;
  endTimecode: number;
  label?: string;
}

// Example
const { version } = await trpc.version.createFromTimecode.mutate({
  sourceVersionId: "ver_v1",
  startTimecode: 10000,
  endTimecode: 30000,
  label: "Clip Extract",
});
```

---

## Business Rules

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| `videoId` | Must exist and user must have EDITOR access | `NOT_FOUND` / `FORBIDDEN` |
| `label` | Max 100 characters | `BAD_REQUEST` |
| `description` | Max 2000 characters | `BAD_REQUEST` |
| `fileSize` | Must not exceed plan limit | `FORBIDDEN` |
| `mimeType` | Must be supported video type | `BAD_REQUEST` |
| `versionNumber` | Auto-incremented, cannot be set manually | N/A |

### Permission Rules

| Action | Required Permission |
|--------|---------------------|
| Upload new version | `EDITOR` or higher on video/project |
| View versions | `VIEWER` or higher |
| Set active version | `EDITOR` or higher |
| Update version metadata | Owner of version or `EDITOR` |
| Archive version | `EDITOR` or higher |
| Delete version | `OWNER` only |
| Compare versions | `VIEWER` or higher |
| Migrate comments | `EDITOR` or higher |

### Limits

| Resource | Free | Pro | Team |
|----------|------|-----|------|
| Versions per video | 3 | 25 | 100 |
| Version file size | 500MB | 5GB | 25GB |
| Comparison sessions | 1 | 5 | Unlimited |
| Archived versions | 5 | 50 | Unlimited |
| AI change analysis | ❌ | ✅ | ✅ |

### Version Number Rules

1. Version numbers are sequential starting from 1
2. Numbers are never reused (deleted v2 doesn't free up "2")
3. Gaps are allowed (v1, v3 if v2 deleted)
4. Only one version can be "active" at a time
5. New uploads automatically get the next number

---

## tRPC Router Implementation

```typescript
// packages/api/src/routers/version/index.ts
import { router } from "../../init";
import { uploadVersion } from "./upload";
import { confirmUpload } from "./confirm-upload";
import { getVersions } from "./get-all";
import { getVersionById } from "./get-by-id";
import { setActiveVersion } from "./set-active";
import { updateVersion } from "./update";
import { archiveVersion } from "./archive";
import { restoreVersion } from "./restore";
import { deleteVersion } from "./delete";
import { compareVersions } from "./compare";
import { updateComparison } from "./update-comparison";
import { getVersionDiff } from "./get-diff";
import { migrateComments } from "./migrate-comments";
import { copyAnnotations } from "./copy-annotations";

export const versionRouter = router({
  // Core CRUD
  upload: uploadVersion,
  confirmUpload: confirmUpload,
  getAll: getVersions,
  getById: getVersionById,
  update: updateVersion,
  
  // Version management
  setActive: setActiveVersion,
  archive: archiveVersion,
  restore: restoreVersion,
  delete: deleteVersion,
  
  // Comparison
  compare: compareVersions,
  updateComparison: updateComparison,
  getDiff: getVersionDiff,
  
  // Migration
  migrateComments: migrateComments,
  copyAnnotations: copyAnnotations,
});
```

### Example Procedure: upload

```typescript
// packages/api/src/routers/version/upload.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../init";
import { db } from "@koko/db";
import { version, video } from "@koko/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateUploadUrl } from "../../lib/storage";

const inputSchema = z.object({
  videoId: z.string(),
  label: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  fileName: z.string(),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
});

const SUPPORTED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];

export const uploadVersion = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ ctx, input }): Promise<VersionUploadResponse> => {
    // Verify video exists
    const videoRecord = await db.query.video.findFirst({
      where: eq(video.id, input.videoId),
      with: { project: true },
    });

    if (!videoRecord) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
    }

    // Check permission (EDITOR or higher)
    const hasAccess = await checkVideoAccess(ctx.session.user.id, input.videoId, "EDITOR");
    if (!hasAccess) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }

    // Validate mime type
    if (!SUPPORTED_TYPES.includes(input.mimeType)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unsupported file type. Supported: ${SUPPORTED_TYPES.join(", ")}`,
      });
    }

    // Check file size limit
    const sizeLimit = getUserFileSizeLimit(ctx.session.user);
    if (input.fileSize > sizeLimit) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `File size exceeds limit of ${formatBytes(sizeLimit)}`,
      });
    }

    // Check version count limit
    const versionCount = await db
      .select({ count: sql`count(*)` })
      .from(version)
      .where(and(
        eq(version.videoId, input.videoId),
        ne(version.status, "archived")
      ));

    const versionLimit = getUserVersionLimit(ctx.session.user);
    if (versionCount[0].count >= versionLimit) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Version limit reached (${versionLimit}). Archive or delete existing versions.`,
      });
    }

    // Get next version number
    const latestVersion = await db.query.version.findFirst({
      where: eq(version.videoId, input.videoId),
      orderBy: desc(version.versionNumber),
    });
    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    // Generate upload URL
    const versionId = `ver_${nanoid()}`;
    const uploadId = `upload_${nanoid()}`;
    const { uploadUrl, expiresAt } = await generateUploadUrl({
      key: `videos/${input.videoId}/versions/${versionId}/${input.fileName}`,
      contentType: input.mimeType,
      contentLength: input.fileSize,
    });

    // Create version record
    const [newVersion] = await db
      .insert(version)
      .values({
        id: versionId,
        videoId: input.videoId,
        versionNumber: nextVersionNumber,
        label: input.label ?? `V${nextVersionNumber}`,
        description: input.description,
        status: "uploading",
        sourceUrl: `videos/${input.videoId}/versions/${versionId}/${input.fileName}`,
        createdBy: ctx.session.user.id,
        isActive: false,
      })
      .returning();

    // Store upload session
    await storeUploadSession(uploadId, {
      versionId,
      expiresAt,
    });

    return {
      version: newVersion,
      uploadUrl,
      uploadId,
      expiresAt,
    };
  });
```

### Example Procedure: setActive

```typescript
// packages/api/src/routers/version/set-active.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../init";
import { db } from "@koko/db";
import { version } from "@koko/db/schema";
import { eq, and } from "drizzle-orm";

const inputSchema = z.object({
  id: z.string(),
});

export const setActiveVersion = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ ctx, input }): Promise<{ version: typeof version.$inferSelect }> => {
    // Get version with video
    const versionRecord = await db.query.version.findFirst({
      where: eq(version.id, input.id),
      with: { video: { with: { project: true } } },
    });

    if (!versionRecord) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
    }

    if (versionRecord.status !== "ready") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot set non-ready version as active",
      });
    }

    if (versionRecord.status === "archived") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot set archived version as active. Restore it first.",
      });
    }

    // Check permission
    const hasAccess = await checkVideoAccess(ctx.session.user.id, versionRecord.videoId, "EDITOR");
    if (!hasAccess) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }

    // Use transaction to ensure only one active version
    const [updatedVersion] = await db.transaction(async (tx) => {
      // Deactivate all versions for this video
      await tx
        .update(version)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(version.videoId, versionRecord.videoId));

      // Activate the selected version
      return tx
        .update(version)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(version.id, input.id))
        .returning();
    });

    return { version: updatedVersion };
  });
```

---

## React Integration

### Custom Hooks

```typescript
// apps/web/src/hooks/use-versions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export function useVersions({ videoId }: { videoId: string }) {
  return useQuery({
    queryKey: ["versions", videoId],
    queryFn: () => trpc.version.getAll.query({ videoId }),
    enabled: !!videoId,
  });
}

export function useVersion({ id }: { id: string }) {
  return useQuery({
    queryKey: ["version", id],
    queryFn: () => trpc.version.getById.query({ id }),
    enabled: !!id,
  });
}

export function useActiveVersion({ videoId }: { videoId: string }) {
  const { data } = useVersions({ videoId });
  return data?.activeVersion ?? null;
}

export function useUploadVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trpc.version.upload.mutate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["versions", data.version.videoId],
      });
    },
  });
}

export function useSetActiveVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trpc.version.setActive.mutate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["versions", data.version.videoId],
      });
      queryClient.invalidateQueries({
        queryKey: ["video", data.version.videoId],
      });
    },
  });
}

export function useCompareVersions() {
  return useMutation({
    mutationFn: trpc.version.compare.mutate,
  });
}

export function useVersionDiff({ 
  leftVersionId, 
  rightVersionId,
  enabled = true,
}: { 
  leftVersionId: string; 
  rightVersionId: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["version-diff", leftVersionId, rightVersionId],
    queryFn: () => trpc.version.getDiff.query({ leftVersionId, rightVersionId }),
    enabled: enabled && !!leftVersionId && !!rightVersionId,
  });
}

export function useMigrateComments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trpc.version.migrateComments.mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });
}
```

### Version Selector Component

```typescript
// apps/web/src/components/version-selector.tsx
import { useState } from "react";
import { useVersions, useSetActiveVersion } from "@/hooks/use-versions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Clock, AlertCircle, Archive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VersionSelectorProps {
  videoId: string;
  onVersionChange?: (versionId: string) => void;
}

const statusIcons = {
  ready: Check,
  processing: Clock,
  failed: AlertCircle,
  archived: Archive,
  uploading: Clock,
};

const statusColors = {
  ready: "bg-green-500",
  processing: "bg-yellow-500",
  failed: "bg-red-500",
  archived: "bg-gray-500",
  uploading: "bg-blue-500",
};

export function VersionSelector({ videoId, onVersionChange }: VersionSelectorProps) {
  const { data, isLoading } = useVersions({ videoId });
  const setActive = useSetActiveVersion();
  
  const [selectedId, setSelectedId] = useState<string | null>(
    data?.activeVersion?.id ?? null
  );

  const handleChange = (versionId: string) => {
    setSelectedId(versionId);
    onVersionChange?.(versionId);
  };

  const handleSetActive = () => {
    if (selectedId) {
      setActive.mutate({ id: selectedId });
    }
  };

  if (isLoading) {
    return <div className="h-10 w-48 bg-muted animate-pulse rounded-md" />;
  }

  const versions = data?.versions ?? [];
  const activeVersion = data?.activeVersion;
  const selectedVersion = versions.find(v => v.id === selectedId);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedId ?? undefined} onValueChange={handleChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select version" />
        </SelectTrigger>
        <SelectContent>
          {versions.map((version) => {
            const StatusIcon = statusIcons[version.status];
            return (
              <SelectItem key={version.id} value={version.id}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusColors[version.status]}`} />
                  <span>{version.label ?? `V${version.versionNumber}`}</span>
                  {version.isActive && (
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {selectedVersion && !selectedVersion.isActive && selectedVersion.status === "ready" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSetActive}
          disabled={setActive.isPending}
        >
          Set as Active
        </Button>
      )}

      {selectedVersion && (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(selectedVersion.createdAt, { addSuffix: true })}
        </span>
      )}
    </div>
  );
}
```

### Version Comparison Component

```typescript
// apps/web/src/components/version-comparison.tsx
import { useState, useRef, useEffect } from "react";
import { useCompareVersions, useVersionDiff } from "@/hooks/use-versions";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  Link, 
  Unlink,
  ArrowLeftRight,
} from "lucide-react";
import { VideoPlayer } from "@/components/video-player";

interface VersionComparisonProps {
  videoId: string;
  leftVersionId: string;
  rightVersionId: string;
}

export function VersionComparison({
  videoId,
  leftVersionId,
  rightVersionId,
}: VersionComparisonProps) {
  const leftPlayerRef = useRef<HTMLVideoElement>(null);
  const rightPlayerRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncMode, setSyncMode] = useState<"timecode" | "independent">("timecode");
  const [currentTime, setCurrentTime] = useState(0);

  const { data: diffData } = useVersionDiff({
    leftVersionId,
    rightVersionId,
  });

  // Sync playback when in timecode mode
  useEffect(() => {
    if (syncMode !== "timecode") return;

    const leftPlayer = leftPlayerRef.current;
    const rightPlayer = rightPlayerRef.current;

    if (!leftPlayer || !rightPlayer) return;

    const handleTimeUpdate = () => {
      const time = leftPlayer.currentTime;
      setCurrentTime(time);
      
      // Sync right player
      if (Math.abs(rightPlayer.currentTime - time) > 0.1) {
        rightPlayer.currentTime = time;
      }
    };

    leftPlayer.addEventListener("timeupdate", handleTimeUpdate);
    return () => leftPlayer.removeEventListener("timeupdate", handleTimeUpdate);
  }, [syncMode]);

  const handlePlayPause = () => {
    const leftPlayer = leftPlayerRef.current;
    const rightPlayer = rightPlayerRef.current;

    if (isPlaying) {
      leftPlayer?.pause();
      rightPlayer?.pause();
    } else {
      leftPlayer?.play();
      if (syncMode === "timecode") {
        rightPlayer?.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    const leftPlayer = leftPlayerRef.current;
    const rightPlayer = rightPlayerRef.current;

    if (leftPlayer) leftPlayer.currentTime = time;
    if (rightPlayer && syncMode === "timecode") {
      rightPlayer.currentTime = time;
    }
    setCurrentTime(time);
  };

  return (
    <div className="space-y-4">
      {/* Comparison header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Version Comparison</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={syncMode === "timecode" ? "default" : "outline"}
            size="sm"
            onClick={() => setSyncMode(syncMode === "timecode" ? "independent" : "timecode")}
          >
            {syncMode === "timecode" ? (
              <>
                <Link className="h-4 w-4 mr-1" />
                Synced
              </>
            ) : (
              <>
                <Unlink className="h-4 w-4 mr-1" />
                Independent
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Side-by-side players */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Version A (Left)</div>
          <VideoPlayer
            ref={leftPlayerRef}
            versionId={leftVersionId}
            className="aspect-video"
          />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Version B (Right)</div>
          <VideoPlayer
            ref={rightPlayerRef}
            versionId={rightVersionId}
            className="aspect-video"
          />
        </div>
      </div>

      {/* Shared controls */}
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <Button variant="ghost" size="icon" onClick={() => handleSeek(0)}>
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handlePlayPause}>
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <div className="flex-1">
          <Slider
            value={[currentTime]}
            max={leftPlayerRef.current?.duration ?? 100}
            step={0.1}
            onValueChange={([value]) => handleSeek(value)}
          />
        </div>
        <span className="text-sm font-mono">
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Diff summary */}
      {diffData && (
        <div className="p-4 border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Analysis</span>
            <Badge variant="outline">
              {Math.round(diffData.diff.similarity)}% similar
            </Badge>
          </div>
          {diffData.diff.durationDiff !== 0 && (
            <div className="text-sm text-muted-foreground">
              Duration difference: {formatDuration(diffData.diff.durationDiff)}
            </div>
          )}
          {diffData.diff.changes.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Changes detected:</div>
              {diffData.diff.changes.map((change, i) => (
                <div 
                  key={i}
                  className="text-sm text-muted-foreground flex items-center gap-2"
                >
                  <Badge 
                    variant={
                      change.type === "added" ? "default" : 
                      change.type === "removed" ? "destructive" : "secondary"
                    }
                  >
                    {change.type}
                  </Badge>
                  <span>
                    {formatTime(change.timecodeStart)} - {formatTime(change.timecodeEnd)}
                  </span>
                  {change.description && (
                    <span className="text-muted-foreground">{change.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const sign = seconds >= 0 ? "+" : "-";
  return `${sign}${formatTime(Math.abs(seconds))}`;
}
```

---

## Testing Scenarios

### Test Structure

```
packages/api/tests/version/
├── upload/
│   ├── initiates-upload-successfully.test.ts
│   ├── increments-version-number.test.ts
│   ├── throws-video-not-found.test.ts
│   ├── throws-forbidden-no-access.test.ts
│   ├── throws-unsupported-file-type.test.ts
│   ├── throws-file-size-exceeded.test.ts
│   └── throws-version-limit-reached.test.ts
├── confirm-upload/
│   ├── triggers-processing.test.ts
│   ├── throws-invalid-upload-id.test.ts
│   └── throws-upload-expired.test.ts
├── get-all/
│   ├── returns-all-versions.test.ts
│   ├── returns-active-version.test.ts
│   ├── excludes-archived-by-default.test.ts
│   └── includes-archived-when-requested.test.ts
├── set-active/
│   ├── sets-version-as-active.test.ts
│   ├── deactivates-previous-active.test.ts
│   ├── throws-not-found.test.ts
│   ├── throws-not-ready.test.ts
│   └── throws-forbidden.test.ts
├── archive/
│   ├── archives-version.test.ts
│   ├── throws-if-only-version.test.ts
│   └── throws-if-active-version.test.ts
├── compare/
│   ├── creates-comparison-session.test.ts
│   ├── throws-same-version.test.ts
│   └── throws-different-videos.test.ts
├── get-diff/
│   ├── returns-diff-analysis.test.ts
│   └── calculates-similarity.test.ts
└── migrate-comments/
    ├── migrates-comments-successfully.test.ts
    ├── adjusts-timecodes.test.ts
    ├── skips-out-of-range-comments.test.ts
    └── throws-forbidden.test.ts
```

### Example Test

```typescript
// packages/api/tests/version/set-active/sets-version-as-active.test.ts
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectOnce, mockUpdate, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
  vi.restoreAllMocks();
  resetDbMocks();
});

it("sets a version as active and deactivates others", async () => {
  // Arrange
  const mockVersion = {
    id: "ver_v2",
    videoId: "video_123",
    versionNumber: 2,
    status: "ready",
    isActive: false,
    createdBy: "user_owner",
  };

  // Mock version lookup
  mockSelectOnce([mockVersion]);
  // Mock permission check
  mockSelectOnce([{ permission: "EDITOR" }]);
  // Mock transaction updates
  mockUpdate([{ ...mockVersion, isActive: true }]);

  const caller = createTestCaller({
    session: createTestSession({ userId: "user_owner" }),
  });

  // Act
  const result = await caller.version.setActive({
    id: "ver_v2",
  });

  // Assert
  expect(result.version.isActive).toBe(true);
  expect(result.version.id).toBe("ver_v2");
});
```

---

## Error Handling

### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `NOT_FOUND` | 404 | Video or version not found |
| `FORBIDDEN` | 403 | Insufficient permissions or limit reached |
| `BAD_REQUEST` | 400 | Invalid input (file type, status) |
| `CONFLICT` | 409 | Cannot delete only version |
| `UNAUTHORIZED` | 401 | Not authenticated |

### Error Examples

```typescript
// Video not found
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Video not found",
});

// Version not ready
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Cannot set non-ready version as active",
});

// Cannot delete active version
throw new TRPCError({
  code: "CONFLICT",
  message: "Cannot delete active version. Set another version as active first.",
});

// Version limit reached
throw new TRPCError({
  code: "FORBIDDEN",
  message: "Version limit reached (25). Archive or delete existing versions.",
});

// File too large
throw new TRPCError({
  code: "FORBIDDEN",
  message: "File size exceeds limit of 5GB. Upgrade your plan for larger uploads.",
});
```

---

## Related Documentation

- [Videos API](./04-videos) - Video management and uploads
- [Annotations API](./06-annotations) - Frame annotations per version
- [Comments API](./05-comments) - Comments linked to versions
- [Comparisons API](./26-comparisons) - Side-by-side version comparison
- [Exports API](./23-exports) - Export specific versions

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | TBD | Initial release with upload, list, set active |
| 1.1.0 | TBD | Added comparison and diff analysis |
| 1.2.0 | TBD | Comment/annotation migration between versions |
| 1.3.0 | TBD | AI-powered change analysis |
