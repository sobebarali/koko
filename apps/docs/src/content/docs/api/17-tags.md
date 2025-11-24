---
title: Tags & Labels API
description: Organize videos, projects, and assets with custom tags
---

# 🏷️ Tags & Labels API

## Overview

The Tags API enables custom categorization and organization of videos, projects, and assets. Users can create reusable tags, apply them to resources, and use them for filtering and search.

## 📋 Growth Phase Endpoints

### `tag.create` - Create Tag

Create a new custom tag.

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const createTagSchema = z.object({
	name: z.string().min(1).max(50).trim(),
	
	// Optional color (hex)
	color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
	
	// Optional description
	description: z.string().max(200).optional(),
});
```

#### Output Schema

```typescript
interface CreateTagOutput {
	tag: {
		id: string;
		name: string;
		color?: string;
		description?: string;
		userId: string; // Tag owner
		usageCount: number; // Times used across resources
		createdAt: Date;
	};
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

const tag = await trpc.tag.create.mutate({
	name: "Marketing",
	color: "#FF6B6B",
	description: "Marketing and promotional content",
});

console.log(`Tag created: ${tag.tag.name}`);
```

#### Business Rules

1. **Unique Names** - Tag names must be unique per user (case-insensitive)
2. **Auto-trim** - Remove leading/trailing whitespace
3. **Color Validation** - Must be valid hex color if provided
4. **Default Color** - Auto-assign color if not provided
5. **Quota** - Max 100 custom tags per user

#### Error Codes

```typescript
throw new TRPCError({
	code: "CONFLICT",
	message: "Tag with this name already exists",
});

throw new TRPCError({
	code: "BAD_REQUEST",
	message: "Invalid color format. Use hex format (#RRGGBB)",
});

throw new TRPCError({
	code: "FORBIDDEN",
	message: "Tag limit reached (100 max). Delete unused tags to create new ones.",
});
```

---

### `tag.getAll` - List All Tags

Get all tags created by the user.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const getAllTagsSchema = z.object({
	// Filter
	includeUnused: z.boolean().default(false), // Include tags with 0 usage
	
	// Sorting
	sortBy: z.enum(["name", "usageCount", "createdAt"]).default("name"),
	sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
```

#### Output Schema

```typescript
interface GetAllTagsOutput {
	tags: {
		id: string;
		name: string;
		color?: string;
		description?: string;
		usageCount: number;
		lastUsed?: Date;
		createdAt: Date;
		
		// Usage breakdown
		usedIn: {
			videos: number;
			projects: number;
			assets: number;
		};
	}[];
	
	total: number;
}
```

#### Usage Example

```typescript
const { tags, total } = await trpc.tag.getAll.query({
	includeUnused: false,
	sortBy: "usageCount",
	sortOrder: "desc",
});

// Display top tags
tags.slice(0, 10).forEach((tag) => {
	console.log(`${tag.name}: ${tag.usageCount} uses`);
});
```

---

### `tag.update` - Update Tag

Update tag name, color, or description.

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const updateTagSchema = z.object({
	tagId: z.string(),
	
	// Fields to update
	name: z.string().min(1).max(50).trim().optional(),
	color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
	description: z.string().max(200).optional(),
});
```

#### Output Schema

```typescript
interface UpdateTagOutput {
	tag: {
		id: string;
		name: string;
		color?: string;
		description?: string;
		updatedAt: Date;
	};
	
	// Affected resources
	affectedResources: {
		videos: number;
		projects: number;
		assets: number;
	};
}
```

#### Usage Example

```typescript
const result = await trpc.tag.update.mutate({
	tagId: "507f1f77bcf86cd799439011",
	name: "Product Marketing",
	color: "#4ECDC4",
});

console.log(`Updated tag. Affected ${result.affectedResources.videos} videos.`);
```

#### Business Rules

1. **Ownership Check** - Only tag owner can update
2. **Name Uniqueness** - Check for conflicts if renaming
3. **Cascade Update** - All tagged resources reflect new name/color
4. **History Preserved** - Old tag name searchable (soft update)

---

### `tag.delete` - Delete Tag

Delete a tag (removes from all resources).

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const deleteTagSchema = z.object({
	tagId: z.string(),
	
	// Confirmation (required if tag is in use)
	confirm: z.boolean().default(false),
});
```

#### Output Schema

```typescript
interface DeleteTagOutput {
	success: true;
	
	// Cleanup stats
	removed: {
		videos: number;
		projects: number;
		assets: number;
	};
}
```

#### Usage Example

```typescript
// Check usage first
const tag = await trpc.tag.getById.query({ id: tagId });

if (tag.usageCount > 0) {
	const confirmDelete = confirm(
		`This tag is used ${tag.usageCount} times. Delete anyway?`
	);
	
	if (!confirmDelete) return;
}

// Delete
const result = await trpc.tag.delete.mutate({
	tagId,
	confirm: true,
});

console.log(`Removed from ${result.removed.videos} videos`);
```

#### Business Rules

1. **Confirmation Required** - If tag is used, require explicit confirm
2. **Cascade Delete** - Remove from all resources
3. **Soft Delete** - Keep in search history for 30 days
4. **No Undo** - Deletion is permanent after 30 days

#### Error Codes

```typescript
throw new TRPCError({
	code: "FORBIDDEN",
	message: "You don't have permission to delete this tag",
});

throw new TRPCError({
	code: "PRECONDITION_FAILED",
	message: "Tag is in use. Set confirm=true to delete anyway.",
	data: {
		usageCount: tag.usageCount,
		usedIn: tag.usedIn,
	},
});
```

---

### `tag.merge` - Merge Tags

Merge two tags into one (combine usage).

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const mergeTagsSchema = z.object({
	sourceTagId: z.string(), // Tag to be merged (deleted)
	targetTagId: z.string(), // Tag to keep
	
	// Whether to keep source tag color
	keepSourceColor: z.boolean().default(false),
});
```

#### Output Schema

```typescript
interface MergeTagsOutput {
	success: true;
	
	mergedTag: {
		id: string; // Target tag ID
		name: string;
		color?: string;
		totalUsage: number; // Combined usage
	};
	
	// Migration stats
	migrated: {
		videos: number;
		projects: number;
		assets: number;
	};
}
```

#### Usage Example

```typescript
// Merge "Marketing" and "Promo" into "Marketing"
const result = await trpc.tag.merge.mutate({
	sourceTagId: promoTagId, // Will be deleted
	targetTagId: marketingTagId, // Will be kept
	keepSourceColor: false,
});

console.log(`Merged! Total usage: ${result.mergedTag.totalUsage}`);
```

#### Business Rules

1. **Ownership Check** - User must own both tags
2. **Deduplication** - Resources with both tags keep only one
3. **Source Deletion** - Source tag deleted after merge
4. **Atomic Operation** - All-or-nothing transaction

---

### 🎯 `tag.suggest` - AI Tag Suggestions (Scale Phase)

Get AI-powered tag suggestions based on content analysis.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const suggestTagsSchema = z.object({
	// Target resource
	resourceType: z.enum(["video", "project"]),
	resourceId: z.string(),
	
	// Number of suggestions
	limit: z.number().min(1).max(10).default(5),
});
```

#### Output Schema

```typescript
interface SuggestTagsOutput {
	suggestions: {
		tag: string;
		confidence: number; // 0-1
		reason: string; // Why suggested
		existingTag: boolean; // If user already has this tag
		existingTagId?: string;
	}[];
}
```

#### Usage Example

```typescript
// Upload video → get tag suggestions
const video = await trpc.video.createUpload.mutate({ ... });

const suggestions = await trpc.tag.suggest.query({
	resourceType: "video",
	resourceId: video.id,
	limit: 5,
});

// Auto-apply high-confidence tags
suggestions
	.filter((s) => s.confidence > 0.8)
	.forEach((s) => {
		if (s.existingTag) {
			applyTag(video.id, s.existingTagId);
		} else {
			createAndApplyTag(video.id, s.tag);
		}
	});
```

#### AI Analysis

Uses:
1. **Video Title/Description** - Extract keywords
2. **Transcript** (if available) - Analyze spoken content
3. **Visual Analysis** - Scene detection, object recognition
4. **User History** - Common tags user applies to similar content

---

## 🎨 Tag Colors

### Default Color Palette

```typescript
const defaultColors = [
	"#FF6B6B", // Red
	"#4ECDC4", // Teal
	"#45B7D1", // Blue
	"#FFA07A", // Orange
	"#98D8C8", // Green
	"#F7DC6F", // Yellow
	"#BB8FCE", // Purple
	"#85929E", // Gray
	"#F8B500", // Gold
	"#E74C3C", // Crimson
];

// Auto-assign color on creation
const assignColor = (index: number) => {
	return defaultColors[index % defaultColors.length];
};
```

---

## 📊 Tag Analytics

### Popular Tags

```typescript
// Get top 10 most-used tags
const popularTags = await db.tag.findMany({
	where: { userId: user.id },
	orderBy: { usageCount: "desc" },
	take: 10,
});
```

### Tag Cloud Data

```typescript
interface TagCloudData {
	tags: {
		name: string;
		count: number;
		fontSize: number; // Proportional to usage
	}[];
}

// Calculate tag cloud
const tags = await db.tag.findMany({ where: { userId } });
const maxCount = Math.max(...tags.map((t) => t.usageCount));

const tagCloud = tags.map((tag) => ({
	name: tag.name,
	count: tag.usageCount,
	fontSize: 12 + (tag.usageCount / maxCount) * 24, // 12-36px
}));
```

---

## 🔧 Applying Tags to Resources

### Add Tag to Video

```typescript
// In video router
addTag: protectedProcedure
	.input(z.object({
		videoId: z.string(),
		tagId: z.string(),
	}))
	.mutation(async ({ ctx, input }) => {
		// Check ownership
		const video = await ctx.db.video.findUnique({
			where: { id: input.videoId },
		});
		
		if (video.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "FORBIDDEN" });
		}
		
		// Add tag
		await ctx.db.video.update({
			where: { id: input.videoId },
			data: {
				tags: { push: input.tagId },
			},
		});
		
		// Increment usage count
		await ctx.db.tag.update({
			where: { id: input.tagId },
			data: {
				usageCount: { increment: 1 },
				lastUsed: new Date(),
			},
		});
		
		return { success: true };
	});
```

### Filter by Tag

```typescript
// Get videos with specific tag
const videos = await trpc.video.getAll.query({
	projectId: "...",
	filters: {
		tags: ["marketing", "product"], // OR condition
	},
});
```

---

## 🔗 Related APIs

- [Videos API](./04-videos) - Tag videos
- [Projects API](./03-projects) - Tag projects
- [Assets API](./11-assets) - Tag assets
- [Search API](./16-search) - Search by tag

---

## 🛡️ Security Considerations

1. **Tag Ownership** - Users can only modify their own tags
2. **Resource Permissions** - Check permissions before tagging resources
3. **Input Sanitization** - Prevent XSS in tag names
4. **Rate Limiting** - Max 100 tag operations per hour
5. **Quota Enforcement** - Max 100 custom tags per user

---

## 📈 Use Cases

### Organize Video Library

```typescript
// Create tags for workflow stages
await trpc.tag.create.mutate({ name: "Raw Footage", color: "#95A5A6" });
await trpc.tag.create.mutate({ name: "In Review", color: "#F39C12" });
await trpc.tag.create.mutate({ name: "Approved", color: "#27AE60" });
await trpc.tag.create.mutate({ name: "Published", color: "#3498DB" });

// Apply to videos
await trpc.video.addTag.mutate({ videoId, tagId: "in-review" });
```

### Filter Projects by Client

```typescript
// Create client tags
await trpc.tag.create.mutate({ name: "Client: Acme Corp", color: "#E74C3C" });
await trpc.tag.create.mutate({ name: "Client: GlobalTech", color: "#9B59B6" });

// Filter projects
const acmeProjects = await trpc.project.getAll.query({
	filters: { tags: ["client-acme-corp"] },
});
```

---

**Last Updated:** November 22, 2025  
**API Version:** 1.0.0 (Growth Phase)
