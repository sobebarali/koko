---
title: Annotations API
description: Visual frame annotations, drawing tools, and collaborative markup for precise video feedback
---

# 🎨 Annotations API

## Overview

The Annotations API enables users to draw directly on video frames to provide precise visual feedback. Annotations complement text-based comments by allowing users to highlight, circle, arrow, or freehand draw on specific elements in the frame.

**Key Capabilities:**
- Draw shapes (rectangles, circles, arrows, lines) on video frames
- Freehand drawing with customizable brush settings
- Text labels and callouts on frames
- Annotations linked to specific timecodes
- Collaborative annotation with multiple contributors
- Export annotations as overlay or separate layer

**Status:** 🔄 Post-Launch (Month 1-2)

---

## Data Models

### Core Interfaces

```typescript
// Annotation types
type AnnotationType = "rectangle" | "circle" | "arrow" | "line" | "freehand" | "text" | "highlight";

// Point coordinates (normalized 0-1 for responsive scaling)
interface Point {
  x: number; // 0-1 normalized X coordinate
  y: number; // 0-1 normalized Y coordinate
}

// Shape-specific data
interface RectangleData {
  type: "rectangle";
  topLeft: Point;
  bottomRight: Point;
  cornerRadius?: number;
}

interface CircleData {
  type: "circle";
  center: Point;
  radiusX: number; // Normalized radius
  radiusY: number; // For ellipses
}

interface ArrowData {
  type: "arrow";
  start: Point;
  end: Point;
  headSize?: number;
  doubleHeaded?: boolean;
}

interface LineData {
  type: "line";
  start: Point;
  end: Point;
  dashed?: boolean;
}

interface FreehandData {
  type: "freehand";
  points: Point[]; // Array of points forming the path
  smoothing?: number; // 0-1 smoothing factor
}

interface TextData {
  type: "text";
  position: Point;
  content: string;
  fontSize: number;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
}

interface HighlightData {
  type: "highlight";
  topLeft: Point;
  bottomRight: Point;
  opacity: number; // 0-1
}

type ShapeData = 
  | RectangleData 
  | CircleData 
  | ArrowData 
  | LineData 
  | FreehandData 
  | TextData 
  | HighlightData;

// Style configuration
interface AnnotationStyle {
  strokeColor: string;      // Hex color (#FF0000)
  strokeWidth: number;      // 1-20 pixels
  fillColor?: string;       // For shapes with fill
  fillOpacity?: number;     // 0-1
  opacity: number;          // Overall opacity 0-1
}

// Main annotation interface
interface Annotation {
  id: string;
  videoId: string;
  commentId?: string;       // Optional link to comment
  createdBy: string;
  timecodeMs: number;       // Frame timecode in milliseconds
  timecodeEnd?: number;     // For range annotations
  type: AnnotationType;
  shapeData: ShapeData;
  style: AnnotationStyle;
  label?: string;           // Optional text label
  isVisible: boolean;
  zIndex: number;           // Stacking order
  createdAt: Date;
  updatedAt: Date;
}

// Annotation group for complex markups
interface AnnotationGroup {
  id: string;
  videoId: string;
  name: string;
  annotationIds: string[];
  createdBy: string;
  createdAt: Date;
}

// Drawing session for real-time collaboration
interface DrawingSession {
  id: string;
  videoId: string;
  userId: string;
  isActive: boolean;
  currentTool: AnnotationType;
  currentStyle: AnnotationStyle;
  startedAt: Date;
  lastActivityAt: Date;
}
```

### API Response Types

```typescript
interface AnnotationResponse {
  annotation: Annotation;
}

interface AnnotationsListResponse {
  annotations: Annotation[];
  total: number;
  timecodeGroups: {
    timecodeMs: number;
    count: number;
  }[];
}

interface AnnotationGroupResponse {
  group: AnnotationGroup;
  annotations: Annotation[];
}

interface DrawingSessionResponse {
  session: DrawingSession;
  activeUsers: {
    userId: string;
    userName: string;
    currentTool: AnnotationType;
    cursorPosition?: Point;
  }[];
}

interface AnnotationExportResponse {
  exportUrl: string;
  format: "png" | "svg" | "json";
  expiresAt: Date;
}
```

---

## Database Schema

### Drizzle Schema Definition

```typescript
// packages/db/src/schema/annotation.ts
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { video } from "./video";
import { comment } from "./comment";
import { user } from "./auth";

// Annotation types enum
export const annotationTypeEnum = [
  "rectangle",
  "circle", 
  "arrow",
  "line",
  "freehand",
  "text",
  "highlight",
] as const;

// Main annotations table
export const annotation = sqliteTable(
  "annotation",
  {
    id: text("id").primaryKey(),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    commentId: text("comment_id")
      .references(() => comment.id, { onDelete: "set null" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    // Timecode
    timecodeMs: integer("timecode_ms").notNull(),
    timecodeEnd: integer("timecode_end"),
    
    // Type and shape data (JSON)
    type: text("type", { enum: annotationTypeEnum }).notNull(),
    shapeData: text("shape_data", { mode: "json" }).$type<ShapeData>().notNull(),
    
    // Style (JSON)
    style: text("style", { mode: "json" }).$type<AnnotationStyle>().notNull(),
    
    // Metadata
    label: text("label"),
    isVisible: integer("is_visible", { mode: "boolean" }).default(true).notNull(),
    zIndex: integer("z_index").default(0).notNull(),
    
    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("annotation_video_idx").on(t.videoId),
    index("annotation_video_timecode_idx").on(t.videoId, t.timecodeMs),
    index("annotation_comment_idx").on(t.commentId),
    index("annotation_created_by_idx").on(t.createdBy),
  ]
);

// Annotation groups for complex markups
export const annotationGroup = sqliteTable(
  "annotation_group",
  {
    id: text("id").primaryKey(),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("annotation_group_video_idx").on(t.videoId),
  ]
);

// Junction table for group membership
export const annotationGroupMember = sqliteTable(
  "annotation_group_member",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => annotationGroup.id, { onDelete: "cascade" }),
    annotationId: text("annotation_id")
      .notNull()
      .references(() => annotation.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").default(0).notNull(),
  },
  (t) => [
    index("annotation_group_member_group_idx").on(t.groupId),
    index("annotation_group_member_annotation_idx").on(t.annotationId),
  ]
);

// Drawing sessions for real-time collaboration
export const drawingSession = sqliteTable(
  "drawing_session",
  {
    id: text("id").primaryKey(),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    currentTool: text("current_tool", { enum: annotationTypeEnum }).default("rectangle"),
    currentStyle: text("current_style", { mode: "json" }).$type<AnnotationStyle>(),
    cursorPosition: text("cursor_position", { mode: "json" }).$type<Point>(),
    startedAt: integer("started_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    lastActivityAt: integer("last_activity_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("drawing_session_video_idx").on(t.videoId),
    index("drawing_session_user_idx").on(t.userId),
    index("drawing_session_active_idx").on(t.videoId, t.isActive),
  ]
);

// Annotation templates for reusable shapes
export const annotationTemplate = sqliteTable(
  "annotation_template",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: annotationTypeEnum }).notNull(),
    shapeData: text("shape_data", { mode: "json" }).$type<ShapeData>().notNull(),
    style: text("style", { mode: "json" }).$type<AnnotationStyle>().notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("annotation_template_user_idx").on(t.userId),
  ]
);
```

### Relations

```typescript
// packages/db/src/schema/annotation.ts (continued)
import { relations } from "drizzle-orm";

export const annotationRelations = relations(annotation, ({ one, many }) => ({
  video: one(video, {
    fields: [annotation.videoId],
    references: [video.id],
  }),
  comment: one(comment, {
    fields: [annotation.commentId],
    references: [comment.id],
  }),
  creator: one(user, {
    fields: [annotation.createdBy],
    references: [user.id],
  }),
  groupMemberships: many(annotationGroupMember),
}));

export const annotationGroupRelations = relations(annotationGroup, ({ one, many }) => ({
  video: one(video, {
    fields: [annotationGroup.videoId],
    references: [video.id],
  }),
  creator: one(user, {
    fields: [annotationGroup.createdBy],
    references: [user.id],
  }),
  members: many(annotationGroupMember),
}));

export const annotationGroupMemberRelations = relations(annotationGroupMember, ({ one }) => ({
  group: one(annotationGroup, {
    fields: [annotationGroupMember.groupId],
    references: [annotationGroup.id],
  }),
  annotation: one(annotation, {
    fields: [annotationGroupMember.annotationId],
    references: [annotation.id],
  }),
}));

export const drawingSessionRelations = relations(drawingSession, ({ one }) => ({
  video: one(video, {
    fields: [drawingSession.videoId],
    references: [video.id],
  }),
  user: one(user, {
    fields: [drawingSession.userId],
    references: [user.id],
  }),
}));

export const annotationTemplateRelations = relations(annotationTemplate, ({ one }) => ({
  user: one(user, {
    fields: [annotationTemplate.userId],
    references: [user.id],
  }),
}));
```

---

## API Endpoints

### Post-Launch Phase (Month 1-2)

#### annotation.create

Creates a new annotation on a video frame.

```typescript
// Input
interface CreateAnnotationInput {
  videoId: string;
  commentId?: string;
  timecodeMs: number;
  timecodeEnd?: number;
  type: AnnotationType;
  shapeData: ShapeData;
  style: AnnotationStyle;
  label?: string;
}

// Example
const annotation = await trpc.annotation.create.mutate({
  videoId: "video_abc123",
  timecodeMs: 5500,
  type: "arrow",
  shapeData: {
    type: "arrow",
    start: { x: 0.2, y: 0.3 },
    end: { x: 0.5, y: 0.6 },
    headSize: 12,
  },
  style: {
    strokeColor: "#FF0000",
    strokeWidth: 3,
    opacity: 1,
  },
  label: "Check this area",
});
```

#### annotation.getAll

Retrieves all annotations for a video, optionally filtered by timecode range.

```typescript
// Input
interface GetAnnotationsInput {
  videoId: string;
  timecodeStart?: number;
  timecodeEnd?: number;
  createdBy?: string;
  type?: AnnotationType;
  includeHidden?: boolean;
}

// Example
const { annotations, timecodeGroups } = await trpc.annotation.getAll.query({
  videoId: "video_abc123",
  timecodeStart: 0,
  timecodeEnd: 10000,
});
```

#### annotation.getByTimecode

Gets annotations at a specific timecode (for frame display).

```typescript
// Input
interface GetByTimecodeInput {
  videoId: string;
  timecodeMs: number;
  tolerance?: number; // ±ms tolerance (default 100)
}

// Example
const annotations = await trpc.annotation.getByTimecode.query({
  videoId: "video_abc123",
  timecodeMs: 5500,
  tolerance: 50,
});
```

#### annotation.update

Updates an existing annotation.

```typescript
// Input
interface UpdateAnnotationInput {
  id: string;
  shapeData?: ShapeData;
  style?: Partial<AnnotationStyle>;
  label?: string;
  isVisible?: boolean;
  zIndex?: number;
  timecodeMs?: number;
}

// Example
await trpc.annotation.update.mutate({
  id: "annot_xyz789",
  style: {
    strokeColor: "#00FF00",
    strokeWidth: 5,
  },
  label: "Updated label",
});
```

#### annotation.delete

Deletes an annotation.

```typescript
// Input
interface DeleteAnnotationInput {
  id: string;
}

// Example
await trpc.annotation.delete.mutate({
  id: "annot_xyz789",
});
```

#### annotation.bulkCreate

Creates multiple annotations at once (for pasting or importing).

```typescript
// Input
interface BulkCreateInput {
  videoId: string;
  annotations: Omit<CreateAnnotationInput, "videoId">[];
}

// Example
await trpc.annotation.bulkCreate.mutate({
  videoId: "video_abc123",
  annotations: [
    {
      timecodeMs: 5500,
      type: "circle",
      shapeData: { type: "circle", center: { x: 0.5, y: 0.5 }, radiusX: 0.1, radiusY: 0.1 },
      style: { strokeColor: "#FF0000", strokeWidth: 2, opacity: 1 },
    },
    {
      timecodeMs: 5500,
      type: "arrow",
      shapeData: { type: "arrow", start: { x: 0.3, y: 0.3 }, end: { x: 0.5, y: 0.5 } },
      style: { strokeColor: "#FF0000", strokeWidth: 2, opacity: 1 },
    },
  ],
});
```

#### annotation.bulkDelete

Deletes multiple annotations.

```typescript
// Input
interface BulkDeleteInput {
  ids: string[];
}

// Example
await trpc.annotation.bulkDelete.mutate({
  ids: ["annot_1", "annot_2", "annot_3"],
});
```

### Growth Phase (Month 3-6)

#### annotation.createGroup

Groups multiple annotations together.

```typescript
// Input
interface CreateGroupInput {
  videoId: string;
  name: string;
  annotationIds: string[];
}

// Example
const group = await trpc.annotation.createGroup.mutate({
  videoId: "video_abc123",
  name: "Logo feedback",
  annotationIds: ["annot_1", "annot_2"],
});
```

#### annotation.updateGroup

Updates a group's annotations or name.

```typescript
// Input
interface UpdateGroupInput {
  id: string;
  name?: string;
  addAnnotationIds?: string[];
  removeAnnotationIds?: string[];
}

// Example
await trpc.annotation.updateGroup.mutate({
  id: "group_xyz",
  name: "Updated group name",
  addAnnotationIds: ["annot_3"],
});
```

#### annotation.deleteGroup

Deletes a group (annotations remain).

```typescript
// Input
interface DeleteGroupInput {
  id: string;
  deleteAnnotations?: boolean; // Also delete contained annotations
}

// Example
await trpc.annotation.deleteGroup.mutate({
  id: "group_xyz",
  deleteAnnotations: false,
});
```

#### annotation.duplicate

Duplicates an annotation (to another timecode or video).

```typescript
// Input
interface DuplicateInput {
  id: string;
  targetVideoId?: string;
  targetTimecodeMs?: number;
  offsetX?: number;
  offsetY?: number;
}

// Example
const duplicated = await trpc.annotation.duplicate.mutate({
  id: "annot_xyz",
  targetTimecodeMs: 10000,
  offsetX: 0.05,
  offsetY: 0.05,
});
```

#### annotation.export

Exports annotations as image overlay or data.

```typescript
// Input
interface ExportInput {
  videoId: string;
  timecodeMs: number;
  format: "png" | "svg" | "json";
  includeFrame?: boolean; // Include video frame in export
  annotationIds?: string[]; // Specific annotations (or all at timecode)
}

// Example
const { exportUrl, expiresAt } = await trpc.annotation.export.query({
  videoId: "video_abc123",
  timecodeMs: 5500,
  format: "png",
  includeFrame: true,
});
```

### Scale Phase (Month 6+)

#### annotation.startSession

Starts a collaborative drawing session.

```typescript
// Input
interface StartSessionInput {
  videoId: string;
  tool?: AnnotationType;
  style?: AnnotationStyle;
}

// Example
const session = await trpc.annotation.startSession.mutate({
  videoId: "video_abc123",
  tool: "freehand",
  style: {
    strokeColor: "#0000FF",
    strokeWidth: 3,
    opacity: 1,
  },
});
```

#### annotation.updateSession

Updates current session state (tool, cursor position).

```typescript
// Input
interface UpdateSessionInput {
  sessionId: string;
  tool?: AnnotationType;
  style?: AnnotationStyle;
  cursorPosition?: Point;
}

// Example
await trpc.annotation.updateSession.mutate({
  sessionId: "session_123",
  cursorPosition: { x: 0.45, y: 0.32 },
});
```

#### annotation.endSession

Ends a drawing session.

```typescript
// Input
interface EndSessionInput {
  sessionId: string;
}

// Example
await trpc.annotation.endSession.mutate({
  sessionId: "session_123",
});
```

#### annotation.getActiveSessions

Gets all active drawing sessions for a video.

```typescript
// Input
interface GetActiveSessionsInput {
  videoId: string;
}

// Example
const { activeUsers } = await trpc.annotation.getActiveSessions.query({
  videoId: "video_abc123",
});
// Returns: [{ userId, userName, currentTool, cursorPosition }, ...]
```

#### annotation.saveTemplate

Saves current annotation as a reusable template.

```typescript
// Input
interface SaveTemplateInput {
  annotationId?: string; // Copy from existing
  name: string;
  type: AnnotationType;
  shapeData: ShapeData;
  style: AnnotationStyle;
  isDefault?: boolean;
}

// Example
await trpc.annotation.saveTemplate.mutate({
  name: "Red Arrow",
  type: "arrow",
  shapeData: { type: "arrow", start: { x: 0, y: 0 }, end: { x: 0.1, y: 0.1 } },
  style: { strokeColor: "#FF0000", strokeWidth: 3, opacity: 1 },
  isDefault: true,
});
```

#### annotation.getTemplates

Gets user's annotation templates.

```typescript
// Example
const templates = await trpc.annotation.getTemplates.query();
```

---

## Business Rules

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| `videoId` | Must exist and user must have access | `NOT_FOUND` / `FORBIDDEN` |
| `timecodeMs` | Must be 0 to video duration | `BAD_REQUEST` |
| `strokeWidth` | 1-20 pixels | `BAD_REQUEST` |
| `strokeColor` | Valid hex color | `BAD_REQUEST` |
| `opacity` | 0-1 range | `BAD_REQUEST` |
| `points` (freehand) | Max 10,000 points | `BAD_REQUEST` |
| `label` | Max 500 characters | `BAD_REQUEST` |

### Permission Rules

| Action | Required Permission |
|--------|---------------------|
| Create annotation | `REVIEWER` or higher on video/project |
| View annotations | `VIEWER` or higher |
| Update own annotation | Owner of annotation |
| Update any annotation | `EDITOR` or higher |
| Delete own annotation | Owner of annotation |
| Delete any annotation | `EDITOR` or higher |
| Export annotations | `VIEWER` or higher |
| Start drawing session | `REVIEWER` or higher |

### Limits

| Resource | Free | Pro | Team |
|----------|------|-----|------|
| Annotations per video | 50 | 500 | Unlimited |
| Freehand points | 1,000 | 5,000 | 10,000 |
| Templates | 5 | 50 | Unlimited |
| Concurrent sessions | 1 | 5 | 20 |
| Export format | PNG | PNG, SVG | PNG, SVG, JSON |

### Coordinate System

All coordinates are **normalized (0-1)** for responsive scaling:
- `(0, 0)` = top-left corner
- `(1, 1)` = bottom-right corner
- Annotations scale proportionally with video dimensions

---

## tRPC Router Implementation

```typescript
// packages/api/src/routers/annotation/index.ts
import { router } from "../../init";
import { createAnnotation } from "./create";
import { getAnnotations } from "./get-all";
import { getByTimecode } from "./get-by-timecode";
import { updateAnnotation } from "./update";
import { deleteAnnotation } from "./delete";
import { bulkCreate } from "./bulk-create";
import { bulkDelete } from "./bulk-delete";
import { createGroup } from "./create-group";
import { exportAnnotation } from "./export";
import { startSession } from "./start-session";
import { updateSession } from "./update-session";
import { endSession } from "./end-session";
import { getActiveSessions } from "./get-active-sessions";
import { saveTemplate } from "./save-template";
import { getTemplates } from "./get-templates";

export const annotationRouter = router({
  // Core CRUD
  create: createAnnotation,
  getAll: getAnnotations,
  getByTimecode: getByTimecode,
  update: updateAnnotation,
  delete: deleteAnnotation,
  
  // Bulk operations
  bulkCreate: bulkCreate,
  bulkDelete: bulkDelete,
  
  // Groups
  createGroup: createGroup,
  
  // Export
  export: exportAnnotation,
  
  // Sessions
  startSession: startSession,
  updateSession: updateSession,
  endSession: endSession,
  getActiveSessions: getActiveSessions,
  
  // Templates
  saveTemplate: saveTemplate,
  getTemplates: getTemplates,
});
```

### Example Procedure: create

```typescript
// packages/api/src/routers/annotation/create.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../init";
import { db } from "@koko/db";
import { annotation, video } from "@koko/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const styleSchema = z.object({
  strokeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  strokeWidth: z.number().min(1).max(20),
  fillColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fillOpacity: z.number().min(0).max(1).optional(),
  opacity: z.number().min(0).max(1),
});

const shapeDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rectangle"),
    topLeft: pointSchema,
    bottomRight: pointSchema,
    cornerRadius: z.number().optional(),
  }),
  z.object({
    type: z.literal("circle"),
    center: pointSchema,
    radiusX: z.number().min(0).max(1),
    radiusY: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal("arrow"),
    start: pointSchema,
    end: pointSchema,
    headSize: z.number().optional(),
    doubleHeaded: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("line"),
    start: pointSchema,
    end: pointSchema,
    dashed: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("freehand"),
    points: z.array(pointSchema).max(10000),
    smoothing: z.number().min(0).max(1).optional(),
  }),
  z.object({
    type: z.literal("text"),
    position: pointSchema,
    content: z.string().max(500),
    fontSize: z.number().min(8).max(72),
    fontFamily: z.string().optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
  }),
  z.object({
    type: z.literal("highlight"),
    topLeft: pointSchema,
    bottomRight: pointSchema,
    opacity: z.number().min(0).max(1),
  }),
]);

const inputSchema = z.object({
  videoId: z.string(),
  commentId: z.string().optional(),
  timecodeMs: z.number().int().min(0),
  timecodeEnd: z.number().int().min(0).optional(),
  type: z.enum(["rectangle", "circle", "arrow", "line", "freehand", "text", "highlight"]),
  shapeData: shapeDataSchema,
  style: styleSchema,
  label: z.string().max(500).optional(),
});

export const createAnnotation = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ ctx, input }): Promise<{ annotation: typeof annotation.$inferSelect }> => {
    // Verify video exists and user has access
    const videoRecord = await db.query.video.findFirst({
      where: eq(video.id, input.videoId),
      with: { project: true },
    });

    if (!videoRecord) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
    }

    // Check permission (REVIEWER or higher)
    const hasAccess = await checkVideoAccess(ctx.session.user.id, input.videoId, "REVIEWER");
    if (!hasAccess) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }

    // Validate timecode against video duration
    if (videoRecord.durationMs && input.timecodeMs > videoRecord.durationMs) {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Timecode exceeds video duration" 
      });
    }

    // Check annotation limit
    const annotationCount = await db
      .select({ count: sql`count(*)` })
      .from(annotation)
      .where(eq(annotation.videoId, input.videoId));

    const limit = getUserAnnotationLimit(ctx.session.user);
    if (annotationCount[0].count >= limit) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Annotation limit reached (${limit})`,
      });
    }

    // Get next z-index for this timecode
    const maxZIndex = await db
      .select({ max: sql`max(z_index)` })
      .from(annotation)
      .where(and(
        eq(annotation.videoId, input.videoId),
        eq(annotation.timecodeMs, input.timecodeMs)
      ));

    const [newAnnotation] = await db
      .insert(annotation)
      .values({
        id: `annot_${nanoid()}`,
        videoId: input.videoId,
        commentId: input.commentId,
        createdBy: ctx.session.user.id,
        timecodeMs: input.timecodeMs,
        timecodeEnd: input.timecodeEnd,
        type: input.type,
        shapeData: input.shapeData,
        style: input.style,
        label: input.label,
        zIndex: (maxZIndex[0].max ?? 0) + 1,
      })
      .returning();

    return { annotation: newAnnotation };
  });
```

---

## React Integration

### Custom Hooks

```typescript
// apps/web/src/hooks/use-annotations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export function useAnnotations({ videoId }: { videoId: string }) {
  return useQuery({
    queryKey: ["annotations", videoId],
    queryFn: () => trpc.annotation.getAll.query({ videoId }),
    enabled: !!videoId,
  });
}

export function useAnnotationsAtTimecode({ 
  videoId, 
  timecodeMs,
  enabled = true,
}: { 
  videoId: string; 
  timecodeMs: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["annotations", videoId, "timecode", timecodeMs],
    queryFn: () => trpc.annotation.getByTimecode.query({ 
      videoId, 
      timecodeMs,
      tolerance: 100,
    }),
    enabled: enabled && !!videoId,
  });
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trpc.annotation.create.mutate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["annotations", data.annotation.videoId] 
      });
    },
  });
}

export function useUpdateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trpc.annotation.update.mutate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["annotations"] 
      });
    },
  });
}

export function useDeleteAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trpc.annotation.delete.mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annotations"] });
    },
  });
}
```

### Drawing Canvas Component

```typescript
// apps/web/src/components/annotation-canvas.tsx
import { useRef, useState, useCallback, useEffect } from "react";
import { useAnnotationsAtTimecode, useCreateAnnotation } from "@/hooks/use-annotations";
import type { Point, AnnotationType, AnnotationStyle, ShapeData } from "@/types/annotation";

interface AnnotationCanvasProps {
  videoId: string;
  timecodeMs: number;
  videoWidth: number;
  videoHeight: number;
  activeTool: AnnotationType | null;
  activeStyle: AnnotationStyle;
  onAnnotationCreated?: () => void;
}

export function AnnotationCanvas({
  videoId,
  timecodeMs,
  videoWidth,
  videoHeight,
  activeTool,
  activeStyle,
  onAnnotationCreated,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  const { data: annotationsData } = useAnnotationsAtTimecode({
    videoId,
    timecodeMs,
  });

  const createAnnotation = useCreateAnnotation();

  // Convert screen coordinates to normalized (0-1)
  const normalizePoint = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  // Handle mouse down - start drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeTool) return;
    
    setIsDrawing(true);
    const point = normalizePoint(e.clientX, e.clientY);
    setCurrentPoints([point]);
  }, [activeTool, normalizePoint]);

  // Handle mouse move - continue drawing
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !activeTool) return;
    
    const point = normalizePoint(e.clientX, e.clientY);
    
    if (activeTool === "freehand") {
      setCurrentPoints(prev => [...prev, point]);
    } else {
      setCurrentPoints(prev => [prev[0], point]);
    }
  }, [isDrawing, activeTool, normalizePoint]);

  // Handle mouse up - finish drawing and create annotation
  const handleMouseUp = useCallback(async () => {
    if (!isDrawing || !activeTool || currentPoints.length < 2) {
      setIsDrawing(false);
      setCurrentPoints([]);
      return;
    }

    const shapeData = buildShapeData(activeTool, currentPoints);
    
    await createAnnotation.mutateAsync({
      videoId,
      timecodeMs,
      type: activeTool,
      shapeData,
      style: activeStyle,
    });

    setIsDrawing(false);
    setCurrentPoints([]);
    onAnnotationCreated?.();
  }, [isDrawing, activeTool, currentPoints, videoId, timecodeMs, activeStyle, createAnnotation, onAnnotationCreated]);

  // Render annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing annotations
    annotationsData?.annotations.forEach(annotation => {
      renderAnnotation(ctx, annotation, canvas.width, canvas.height);
    });

    // Draw current shape being drawn
    if (isDrawing && currentPoints.length >= 2) {
      renderCurrentShape(ctx, activeTool!, currentPoints, activeStyle, canvas.width, canvas.height);
    }
  }, [annotationsData, isDrawing, currentPoints, activeTool, activeStyle]);

  return (
    <canvas
      ref={canvasRef}
      width={videoWidth}
      height={videoHeight}
      className="absolute inset-0 pointer-events-auto"
      style={{ cursor: activeTool ? "crosshair" : "default" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}

// Helper to build shape data from points
function buildShapeData(type: AnnotationType, points: Point[]): ShapeData {
  const [start, end] = [points[0], points[points.length - 1]];

  switch (type) {
    case "rectangle":
      return {
        type: "rectangle",
        topLeft: { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
        bottomRight: { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) },
      };
    case "circle":
      return {
        type: "circle",
        center: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
        radiusX: Math.abs(end.x - start.x) / 2,
        radiusY: Math.abs(end.y - start.y) / 2,
      };
    case "arrow":
      return { type: "arrow", start, end };
    case "line":
      return { type: "line", start, end };
    case "freehand":
      return { type: "freehand", points };
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}
```

### Toolbar Component

```typescript
// apps/web/src/components/annotation-toolbar.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { 
  Square, 
  Circle, 
  ArrowRight, 
  Minus, 
  Pencil, 
  Type, 
  Highlighter,
  Palette,
} from "lucide-react";
import type { AnnotationType, AnnotationStyle } from "@/types/annotation";

interface AnnotationToolbarProps {
  activeTool: AnnotationType | null;
  activeStyle: AnnotationStyle;
  onToolChange: (tool: AnnotationType | null) => void;
  onStyleChange: (style: AnnotationStyle) => void;
}

const tools: { type: AnnotationType; icon: React.ComponentType; label: string }[] = [
  { type: "rectangle", icon: Square, label: "Rectangle" },
  { type: "circle", icon: Circle, label: "Circle" },
  { type: "arrow", icon: ArrowRight, label: "Arrow" },
  { type: "line", icon: Minus, label: "Line" },
  { type: "freehand", icon: Pencil, label: "Freehand" },
  { type: "text", icon: Type, label: "Text" },
  { type: "highlight", icon: Highlighter, label: "Highlight" },
];

const colors = [
  "#FF0000", "#FF6B00", "#FFD700", "#00FF00", 
  "#00FFFF", "#0000FF", "#8B00FF", "#FF00FF",
  "#FFFFFF", "#000000",
];

export function AnnotationToolbar({
  activeTool,
  activeStyle,
  onToolChange,
  onStyleChange,
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background border rounded-lg shadow-lg">
      {/* Tool buttons */}
      {tools.map(({ type, icon: Icon, label }) => (
        <Button
          key={type}
          variant={activeTool === type ? "default" : "ghost"}
          size="icon"
          title={label}
          onClick={() => onToolChange(activeTool === type ? null : type)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}

      <div className="w-px h-6 bg-border mx-1" />

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon">
            <div 
              className="h-4 w-4 rounded border"
              style={{ backgroundColor: activeStyle.strokeColor }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-5 gap-1">
            {colors.map(color => (
              <button
                key={color}
                className="h-6 w-6 rounded border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => onStyleChange({ ...activeStyle, strokeColor: color })}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Stroke width */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            {activeStyle.strokeWidth}px
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="space-y-2">
            <label className="text-sm font-medium">Stroke Width</label>
            <Slider
              value={[activeStyle.strokeWidth]}
              min={1}
              max={20}
              step={1}
              onValueChange={([value]) => 
                onStyleChange({ ...activeStyle, strokeWidth: value })
              }
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Opacity */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            {Math.round(activeStyle.opacity * 100)}%
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="space-y-2">
            <label className="text-sm font-medium">Opacity</label>
            <Slider
              value={[activeStyle.opacity * 100]}
              min={10}
              max={100}
              step={10}
              onValueChange={([value]) => 
                onStyleChange({ ...activeStyle, opacity: value / 100 })
              }
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

---

## Testing Scenarios

### Test Structure

```
packages/api/tests/annotation/
├── create/
│   ├── creates-rectangle-annotation.test.ts
│   ├── creates-freehand-annotation.test.ts
│   ├── throws-video-not-found.test.ts
│   ├── throws-forbidden-no-access.test.ts
│   ├── throws-invalid-timecode.test.ts
│   ├── throws-limit-reached.test.ts
│   └── validates-coordinates.test.ts
├── get-all/
│   ├── returns-all-annotations.test.ts
│   ├── filters-by-timecode-range.test.ts
│   ├── filters-by-type.test.ts
│   └── returns-timecode-groups.test.ts
├── get-by-timecode/
│   ├── returns-annotations-at-timecode.test.ts
│   ├── respects-tolerance.test.ts
│   └── returns-empty-array.test.ts
├── update/
│   ├── updates-style.test.ts
│   ├── updates-position.test.ts
│   ├── throws-not-found.test.ts
│   └── throws-forbidden-not-owner.test.ts
├── delete/
│   ├── deletes-annotation.test.ts
│   ├── throws-not-found.test.ts
│   └── throws-forbidden-not-owner.test.ts
├── bulk-create/
│   ├── creates-multiple-annotations.test.ts
│   └── validates-all-inputs.test.ts
└── bulk-delete/
    ├── deletes-multiple-annotations.test.ts
    └── skips-unauthorized.test.ts
```

### Example Test

```typescript
// packages/api/tests/annotation/create/creates-rectangle-annotation.test.ts
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectOnce, mockInsertReturning, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
  vi.restoreAllMocks();
  resetDbMocks();
});

it("creates a rectangle annotation on video frame", async () => {
  // Arrange
  const mockVideo = {
    id: "video_123",
    projectId: "proj_456",
    durationMs: 60000,
  };
  
  const mockAnnotation = {
    id: "annot_789",
    videoId: "video_123",
    createdBy: "user_test",
    timecodeMs: 5000,
    type: "rectangle",
    shapeData: {
      type: "rectangle",
      topLeft: { x: 0.1, y: 0.1 },
      bottomRight: { x: 0.5, y: 0.5 },
    },
    style: {
      strokeColor: "#FF0000",
      strokeWidth: 2,
      opacity: 1,
    },
    zIndex: 1,
  };

  // Mock video lookup
  mockSelectOnce([mockVideo]);
  // Mock permission check
  mockSelectOnce([{ permission: "REVIEWER" }]);
  // Mock annotation count
  mockSelectOnce([{ count: 5 }]);
  // Mock max z-index
  mockSelectOnce([{ max: 0 }]);
  // Mock insert
  mockInsertReturning([mockAnnotation]);

  const caller = createTestCaller({
    session: createTestSession(),
  });

  // Act
  const result = await caller.annotation.create({
    videoId: "video_123",
    timecodeMs: 5000,
    type: "rectangle",
    shapeData: {
      type: "rectangle",
      topLeft: { x: 0.1, y: 0.1 },
      bottomRight: { x: 0.5, y: 0.5 },
    },
    style: {
      strokeColor: "#FF0000",
      strokeWidth: 2,
      opacity: 1,
    },
  });

  // Assert
  expect(result.annotation).toBeDefined();
  expect(result.annotation.id).toBe("annot_789");
  expect(result.annotation.type).toBe("rectangle");
  expect(result.annotation.timecodeMs).toBe(5000);
});
```

---

## Error Handling

### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `NOT_FOUND` | 404 | Video or annotation not found |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `BAD_REQUEST` | 400 | Invalid input data |
| `CONFLICT` | 409 | Annotation limit reached |
| `UNAUTHORIZED` | 401 | Not authenticated |

### Error Examples

```typescript
// Video not found
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Video not found",
});

// Permission denied
throw new TRPCError({
  code: "FORBIDDEN",
  message: "You do not have permission to annotate this video",
});

// Invalid timecode
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Timecode exceeds video duration",
});

// Limit reached
throw new TRPCError({
  code: "FORBIDDEN",
  message: "Annotation limit reached. Upgrade to add more annotations.",
});

// Invalid coordinates
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Coordinates must be normalized (0-1 range)",
});
```

---

## Related Documentation

- [Videos API](./04-videos) - Video management and playback
- [Comments API](./05-comments) - Text-based feedback
- [Versions API](./07-versions) - Version comparison with annotations
- [Comparisons API](./26-comparisons) - Side-by-side annotation comparison
- [Presence API](./28-presence) - Real-time collaboration

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | TBD | Initial release with core annotation types |
| 1.1.0 | TBD | Added annotation groups and templates |
| 1.2.0 | TBD | Real-time collaborative drawing sessions |
