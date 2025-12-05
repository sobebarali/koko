---
title: Quota & Usage API
description: Complete API reference for usage tracking, quota enforcement, and limits
---

# 📊 Quota & Usage API

## Overview

The Quota API tracks resource usage and enforces plan limits across projects, videos, storage, team members, and API calls. This ensures users stay within their subscription tier limits and provides visibility into resource consumption.

## 🎯 MVP Endpoints

### `quota.getCurrent` - Get Current Usage & Limits

Get real-time usage statistics and remaining quota for the authenticated user.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
// No input required - returns data for authenticated user
```

#### Output Schema

```typescript
interface QuotaUsage {
	// User & Plan
	userId: string;
	plan: {
		id: string;
		name: "free" | "pro" | "team" | "enterprise";
		displayName: string;
	};
	
	// Billing period
	period: {
		start: Date;
		end: Date;
		daysRemaining: number;
	};
	
	// Projects
	projects: {
		used: number;
		limit: number | null; // null = unlimited
		percentage: number; // 0-100
		available: number; // Remaining quota
		exceeded: boolean;
	};
	
	// Videos
	videos: {
		used: number;
		limit: number | null;
		percentage: number;
		available: number;
		exceeded: boolean;
		
		// Video retention
		retention: {
			enabled: boolean;
			days: number | null; // null = unlimited
			videosScheduledForDeletion: number;
		};
	};
	
	// Storage
	storage: {
		used: number; // Bytes
		limit: number;
		percentage: number;
		available: number; // Bytes remaining
		exceeded: boolean;
		
		// Breakdown
		breakdown: {
			videos: number;
			thumbnails: number;
			assets: number;
		};
		
		// Human-readable
		usedFormatted: string; // "45.2 GB"
		limitFormatted: string; // "100 GB"
	};
	
	// Team members
	teamMembers: {
		used: number; // Active team members
		limit: number;
		percentage: number;
		available: number;
		exceeded: boolean;
		
		// Breakdown
		breakdown: {
			owners: number;
			admins: number;
			members: number;
			guests: number;
		};
	};
	
	// Bandwidth (if tracked)
	bandwidth: {
		used: number; // Bytes transferred this period
		limit: number | null;
		percentage: number;
		available: number;
		exceeded: boolean;
		usedFormatted: string;
	};
	
	// API Calls
	apiCalls: {
		total: number;
		limit: number;
		percentage: number;
		available: number;
		exceeded: boolean;
		
		// Rate limits
		rateLimits: {
			read: { used: number; limit: number; resetsAt: Date };
			write: { used: number; limit: number; resetsAt: Date };
			upload: { used: number; limit: number; resetsAt: Date };
		};
	};
	
	// Overall health
	overall: {
		status: "healthy" | "warning" | "exceeded";
		warnings: string[]; // e.g., "Storage at 85%"
		blockers: string[]; // e.g., "Video limit exceeded"
	};
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

const quota = await trpc.quota.getCurrent.query();

// Check overall status
if (quota.overall.status === "exceeded") {
	console.error("Quota exceeded:", quota.overall.blockers);
}

// Display usage stats
console.log(`Videos: ${quota.videos.used} / ${quota.videos.limit}`);
console.log(`Storage: ${quota.storage.usedFormatted} / ${quota.storage.limitFormatted}`);
console.log(`Team: ${quota.teamMembers.used} / ${quota.teamMembers.limit} members`);

// Check if action is allowed
if (quota.videos.exceeded) {
	alert("Video limit reached! Please upgrade your plan.");
}

// Show warnings at 80%
quota.overall.warnings.forEach((warning) => {
	console.warn(warning);
});
```

#### Response Example

```json
{
	"userId": "507f1f77bcf86cd799439011",
	"plan": {
		"id": "plan_pro",
		"name": "pro",
		"displayName": "Pro"
	},
	"period": {
		"start": "2025-01-15T00:00:00Z",
		"end": "2025-02-15T00:00:00Z",
		"daysRemaining": 18
	},
	"projects": {
		"used": 5,
		"limit": null,
		"percentage": 0,
		"available": -1,
		"exceeded": false
	},
	"videos": {
		"used": 42,
		"limit": 50,
		"percentage": 84,
		"available": 8,
		"exceeded": false,
		"retention": {
			"enabled": true,
			"days": 90,
			"videosScheduledForDeletion": 3
		}
	},
	"storage": {
		"used": 85899345920,
		"limit": 107374182400,
		"percentage": 80,
		"available": 21474836480,
		"exceeded": false,
		"breakdown": {
			"videos": 80530636800,
			"thumbnails": 1073741824,
			"assets": 4294967296
		},
		"usedFormatted": "80 GB",
		"limitFormatted": "100 GB"
	},
	"teamMembers": {
		"used": 7,
		"limit": 10,
		"percentage": 70,
		"available": 3,
		"exceeded": false,
		"breakdown": {
			"owners": 1,
			"admins": 2,
			"members": 4,
			"guests": 0
		}
	},
	"bandwidth": {
		"used": 53687091200,
		"limit": null,
		"percentage": 0,
		"available": -1,
		"exceeded": false,
		"usedFormatted": "50 GB"
	},
	"apiCalls": {
		"total": 1247,
		"limit": 10000,
		"percentage": 12,
		"available": 8753,
		"exceeded": false,
		"rateLimits": {
			"read": {
				"used": 156,
				"limit": 2000,
				"resetsAt": "2025-01-28T15:00:00Z"
			},
			"write": {
				"used": 23,
				"limit": 500,
				"resetsAt": "2025-01-28T15:00:00Z"
			},
			"upload": {
				"used": 4,
				"limit": 20,
				"resetsAt": "2025-01-28T15:00:00Z"
			}
		}
	},
	"overall": {
		"status": "warning",
		"warnings": [
			"Storage at 80% capacity",
			"Videos at 84% of limit (42/50)"
		],
		"blockers": []
	}
}
```

#### Business Rules

1. **Real-time Calculation** - Usage recalculated on each request
2. **Soft Limits** - Warning at 80%, blocking at 100%
3. **Period-based** - Resets at subscription renewal
4. **Cascading Limits** - Project deletion frees video quota
5. **Grace Period** - 5% grace period (e.g., 52 videos on 50 limit)
6. **Immediate Updates** - Usage reflects instantly after actions
7. **Negative Available** - Indicates unlimited (-1)

#### Performance Optimization

```typescript
// Server-side caching (5 minutes)
export const quotaRouter = router({
	getCurrent: protectedProcedure.query(async ({ ctx }) => {
		const cacheKey = `quota:${ctx.session.user.id}`;
		const cached = await redis.get(cacheKey);
		
		if (cached) {
			return JSON.parse(cached);
		}
		
		const quota = await calculateQuota(ctx.session.user.id);
		
		await redis.setex(cacheKey, 300, JSON.stringify(quota)); // 5 min cache
		
		return quota;
	}),
});

// Invalidate cache on usage changes
async function onVideoUploaded(userId: string) {
	await redis.del(`quota:${userId}`);
}
```

#### Error Codes

```typescript
throw new TRPCError({
	code: "UNAUTHORIZED",
	message: "You must be logged in to view quota",
});

throw new TRPCError({
	code: "NOT_FOUND",
	message: "No active subscription found",
});
```

---

### `quota.checkLimit` - Check If Action Allowed

Check if a specific action is allowed within current quota limits (before attempting).

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const checkLimitSchema = z.object({
	action: z.enum([
		"create_project",
		"upload_video",
		"add_team_member",
		"use_storage",
		"api_call_read",
		"api_call_write",
	]),
	
	// Optional: amount required for action
	amount: z.number().optional(), // e.g., file size in bytes for storage
});
```

#### Output Schema

```typescript
interface CheckLimitOutput {
	allowed: boolean;
	reason?: string; // If not allowed
	
	// Current state
	current: {
		used: number;
		limit: number | null;
		available: number;
	};
	
	// After action
	projected: {
		used: number;
		percentage: number;
		wouldExceed: boolean;
	};
	
	// Suggestions
	suggestion?: {
		action: "upgrade" | "delete_old_content" | "wait";
		message: string;
		upgradeUrl?: string; // Link to billing page
	};
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

// Before uploading a video
const canUpload = await trpc.quota.checkLimit.query({
	action: "upload_video",
});

if (!canUpload.allowed) {
	alert(`Cannot upload: ${canUpload.reason}`);
	
	// Show upgrade prompt
	if (canUpload.suggestion?.action === "upgrade") {
		console.log(canUpload.suggestion.message);
		window.location.href = canUpload.suggestion.upgradeUrl;
	}
	
	return;
}

// Before uploading a large file
const file = { size: 5368709120 }; // 5GB

const canUseStorage = await trpc.quota.checkLimit.query({
	action: "use_storage",
	amount: file.size,
});

if (!canUseStorage.allowed) {
	alert(`Not enough storage. Need ${formatBytes(file.size)}, have ${formatBytes(canUseStorage.current.available)}`);
	return;
}

// Before adding team member
const canAddMember = await trpc.quota.checkLimit.query({
	action: "add_team_member",
});

if (!canAddMember.allowed) {
	alert("Team member limit reached. Please upgrade to add more members.");
}
```

#### Response Example (Allowed)

```json
{
	"allowed": true,
	"current": {
		"used": 42,
		"limit": 50,
		"available": 8
	},
	"projected": {
		"used": 43,
		"percentage": 86,
		"wouldExceed": false
	}
}
```

#### Response Example (Not Allowed)

```json
{
	"allowed": false,
	"reason": "Video limit exceeded. You have 50/50 videos.",
	"current": {
		"used": 50,
		"limit": 50,
		"available": 0
	},
	"projected": {
		"used": 51,
		"percentage": 102,
		"wouldExceed": true
	},
	"suggestion": {
		"action": "upgrade",
		"message": "Upgrade to Pro plan for 50 videos, or Team plan for 200 videos",
		"upgradeUrl": "/billing/upgrade?plan=pro"
	}
}
```

#### Response Example (Storage Check)

```json
{
	"allowed": false,
	"reason": "Not enough storage. Need 5 GB, but only 2.5 GB available.",
	"current": {
		"used": 97517035520,
		"limit": 107374182400,
		"available": 2684354560
	},
	"projected": {
		"used": 102885744640,
		"percentage": 95.8,
		"wouldExceed": false
	},
	"suggestion": {
		"action": "delete_old_content",
		"message": "Delete old videos or upgrade to Pro plan for 100 GB storage"
	}
}
```

#### Business Rules

1. **Pre-flight Checks** - Always check before expensive operations
2. **Grace Period** - 5% grace allowed (soft limit)
3. **Hard Blocks** - At 100% usage, all creates blocked
4. **Helpful Messages** - Clear explanation + suggestions
5. **Upgrade Links** - Direct links to billing/upgrade
6. **Soft Delete Impact** - Soft-deleted content still counts toward quota
7. **Immediate Enforcement** - No async quota checks

#### Implementation Pattern

```typescript
// Frontend usage pattern
async function uploadVideo(file: File) {
	// 1. Check quota BEFORE starting upload
	const canUpload = await trpc.quota.checkLimit.query({
		action: "upload_video",
	});
	
	const canUseStorage = await trpc.quota.checkLimit.query({
		action: "use_storage",
		amount: file.size,
	});
	
	if (!canUpload.allowed) {
		showUpgradeModal(canUpload.suggestion);
		return;
	}
	
	if (!canUseStorage.allowed) {
		showStorageFullModal(canUseStorage.suggestion);
		return;
	}
	
	// 2. Proceed with upload
	await startUpload(file);
}

// Backend enforcement
export const videoRouter = router({
	createUpload: protectedProcedure
		.input(createUploadSchema)
		.mutation(async ({ ctx, input }) => {
			// Server-side double-check
			const quota = await getQuota(ctx.session.user.id);
			
			if (quota.videos.exceeded) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Video limit exceeded",
					data: {
						current: quota.videos.used,
						limit: quota.videos.limit,
					},
				});
			}
			
			if (quota.storage.available < input.fileSize) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not enough storage space",
					data: {
						needed: input.fileSize,
						available: quota.storage.available,
					},
				});
			}
			
			// Create video...
		}),
});
```

#### Error Codes

```typescript
throw new TRPCError({
	code: "UNAUTHORIZED",
	message: "You must be logged in",
});

throw new TRPCError({
	code: "BAD_REQUEST",
	message: "Invalid action type",
});

throw new TRPCError({
	code: "BAD_REQUEST",
	message: "Amount required for storage checks",
});
```

---

## 🔄 Post-Launch Endpoints

### `quota.getHistory` - Historical Usage Data

Get usage statistics over time for trend analysis.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const getHistorySchema = z.object({
	// Time range
	from: z.date(),
	to: z.date(),
	
	// Granularity
	interval: z.enum(["daily", "weekly", "monthly"]).default("daily"),
	
	// Metrics to track
	metrics: z.array(
		z.enum(["videos", "storage", "teamMembers", "apiCalls", "bandwidth"])
	).optional(), // If not provided, return all
});
```

#### Output Schema

```typescript
interface UsageHistory {
	period: {
		from: Date;
		to: Date;
		interval: "daily" | "weekly" | "monthly";
	};
	
	dataPoints: {
		timestamp: Date;
		
		videos?: {
			total: number;
			uploaded: number;
			deleted: number;
		};
		
		storage?: {
			total: number; // Bytes
			videos: number;
			thumbnails: number;
			assets: number;
		};
		
		teamMembers?: {
			total: number;
			active: number;
			invited: number;
		};
		
		apiCalls?: {
			total: number;
			reads: number;
			writes: number;
		};
		
		bandwidth?: {
			total: number; // Bytes
			uploads: number;
			downloads: number;
			streaming: number;
		};
	}[];
	
	// Summary stats
	summary: {
		total: number;
		average: number;
		peak: number;
		peakDate: Date;
		trend: "increasing" | "decreasing" | "stable";
		changePercentage: number; // vs previous period
	};
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

// Get last 30 days of storage usage
const history = await trpc.quota.getHistory.query({
	from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
	to: new Date(),
	interval: "daily",
	metrics: ["storage", "videos"],
});

// Render chart
history.dataPoints.forEach((point) => {
	console.log(`${point.timestamp}: ${point.storage.total} bytes, ${point.videos.total} videos`);
});

console.log(`Trend: ${history.summary.trend}`);
console.log(`Change: ${history.summary.changePercentage}%`);
```

#### Business Rules

1. **Max Range** - 1 year maximum
2. **Retention** - Keep 2 years of history
3. **Aggregation** - Daily points aggregated for weekly/monthly
4. **Caching** - Historical data cached aggressively
5. **Trends** - Calculated using linear regression

---

## 📋 Growth Phase Endpoints

### `quota.requestIncrease` - Request Limit Increase

Request a temporary or permanent quota increase (enterprise feature).

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const requestIncreaseSchema = z.object({
	resource: z.enum(["videos", "storage", "teamMembers", "apiCalls"]),
	
	// Requested increase
	requestedLimit: z.number().positive(),
	
	// Justification
	reason: z.enum([
		"temporary_project",
		"seasonal_spike",
		"growth",
		"migration",
		"other",
	]),
	description: z.string().min(50).max(1000),
	
	// Duration (for temporary)
	temporary: z.boolean().default(false),
	durationDays: z.number().min(1).max(90).optional(),
});
```

#### Output Schema

```typescript
interface RequestIncreaseOutput {
	requestId: string;
	status: "pending" | "approved" | "rejected";
	
	request: {
		resource: string;
		currentLimit: number;
		requestedLimit: number;
		increaseAmount: number;
	};
	
	// If auto-approved (enterprise plans)
	newLimit?: number;
	expiresAt?: Date; // For temporary increases
	
	// If pending review
	reviewMessage?: string;
	estimatedResponseTime?: string; // e.g., "1-2 business days"
}
```

#### Business Rules

1. **Auto-approval** - Enterprise plans get instant approval
2. **Team+ Manual** - Pro/Team plans require admin review
3. **Free Blocked** - Free tier cannot request increases
4. **Temporary Max** - Max 90 days for temporary increases
5. **One Active Request** - Can't have multiple pending requests
6. **Justification Required** - Minimum 50 characters

---

### `quota.getBreakdown` - Detailed Usage Breakdown

Get granular breakdown of resource usage by project, user, etc.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const getBreakdownSchema = z.object({
	resource: z.enum(["videos", "storage", "apiCalls"]),
	groupBy: z.enum(["project", "user", "date", "type"]),
	
	// Filters
	projectId: z.string().optional(),
	userId: z.string().optional(),
	
	// Sorting
	sortBy: z.enum(["usage", "name", "date"]).default("usage"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	
	// Pagination
	limit: z.number().min(1).max(100).default(20),
	offset: z.number().default(0),
});
```

#### Output Schema

```typescript
interface UsageBreakdown {
	resource: "videos" | "storage" | "apiCalls";
	groupBy: "project" | "user" | "date" | "type";
	
	total: {
		value: number;
		formatted?: string;
	};
	
	items: {
		id: string;
		name: string;
		usage: number;
		usageFormatted?: string;
		percentage: number; // % of total
		
		// Additional metadata
		lastActivity?: Date;
		itemCount?: number; // e.g., number of videos in project
	}[];
	
	pagination: {
		total: number;
		limit: number;
		offset: number;
		hasMore: boolean;
	};
}
```

#### Usage Example

```typescript
// Storage breakdown by project
const breakdown = await trpc.quota.getBreakdown.query({
	resource: "storage",
	groupBy: "project",
	sortBy: "usage",
	sortOrder: "desc",
	limit: 10,
});

breakdown.items.forEach((project) => {
	console.log(`${project.name}: ${project.usageFormatted} (${project.percentage}%)`);
});

// Find storage hogs
const topProjects = breakdown.items.slice(0, 5);
console.log("Top 5 projects using storage:", topProjects);
```

---

## 🔧 Quota Calculation Logic

### Storage Calculation

```typescript
async function calculateStorageUsage(userId: string): Promise<number> {
	const projects = await db.project.findMany({
		where: { userId },
		include: {
			videos: true,
			assets: true,
		},
	});
	
	let totalStorage = 0;
	
	for (const project of projects) {
		// Videos (Bunny Stream reports file size)
		for (const video of project.videos) {
			totalStorage += video.fileSize;
			
			// Thumbnails (estimated 100KB each)
			totalStorage += 102400;
		}
		
		// Assets (S3 objects)
		for (const asset of project.assets) {
			totalStorage += asset.fileSize;
		}
	}
	
	return totalStorage;
}
```

### Video Count Calculation

```typescript
async function calculateVideoUsage(userId: string): Promise<number> {
	const count = await db.video.count({
		where: {
			project: { userId },
			status: { not: "deleted" }, // Exclude soft-deleted
		},
	});
	
	return count;
}
```

### Team Member Calculation

```typescript
async function calculateTeamMemberUsage(userId: string): Promise<number> {
	const memberships = await db.projectMembership.count({
		where: {
			project: { userId },
			status: "active",
		},
		distinct: ["userId"], // Count unique users
	});
	
	return memberships + 1; // +1 for owner
}
```

---

## 🚨 Quota Enforcement

### Enforcement Points

1. **Video Upload** - Check before creating upload URL
2. **Project Creation** - Check before insert
3. **Team Invite** - Check before sending invitation
4. **File Upload** - Check storage before S3 upload
5. **API Calls** - Rate limiting middleware

### Enforcement Examples

```typescript
// Video upload enforcement
export const videoRouter = router({
	createUpload: protectedProcedure
		.input(createUploadSchema)
		.mutation(async ({ ctx, input }) => {
			const quota = await getQuota(ctx.session.user.id);
			
			// Check video limit
			if (quota.videos.exceeded) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Video limit reached (${quota.videos.limit}). Please upgrade your plan.`,
					data: {
						quota: quota.videos,
						upgradeUrl: "/billing/upgrade",
					},
				});
			}
			
			// Check storage limit
			if (quota.storage.available < input.fileSize) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Not enough storage. Need ${formatBytes(input.fileSize)}, have ${formatBytes(quota.storage.available)}.`,
					data: {
						quota: quota.storage,
						upgradeUrl: "/billing/upgrade",
					},
				});
			}
			
			// Proceed with upload...
		}),
});

// Team member enforcement
export const teamRouter = router({
	inviteMember: protectedProcedure
		.input(inviteMemberSchema)
		.mutation(async ({ ctx, input }) => {
			const quota = await getQuota(ctx.session.user.id);
			
			if (quota.teamMembers.exceeded) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Team member limit reached (${quota.teamMembers.limit}). Upgrade to add more members.`,
					data: {
						quota: quota.teamMembers,
						upgradeUrl: "/billing/upgrade",
					},
				});
			}
			
			// Send invitation...
		}),
});
```

---

## 📊 Frontend Usage Components

### Quota Display Component

```typescript
// components/quota-display.tsx
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";

export function QuotaDisplay() {
	const { data: quota } = trpc.quota.getCurrent.useQuery();
	
	if (!quota) return <div>Loading...</div>;
	
	return (
		<div className="space-y-4">
			{/* Videos */}
			<div>
				<div className="flex justify-between mb-2">
					<span>Videos</span>
					<span>{quota.videos.used} / {quota.videos.limit || "∞"}</span>
				</div>
				<Progress value={quota.videos.percentage} />
			</div>
			
			{/* Storage */}
			<div>
				<div className="flex justify-between mb-2">
					<span>Storage</span>
					<span>{quota.storage.usedFormatted} / {quota.storage.limitFormatted}</span>
				</div>
				<Progress value={quota.storage.percentage} />
				{quota.storage.percentage > 80 && (
					<p className="text-sm text-orange-500 mt-1">
						Storage almost full! Consider upgrading.
					</p>
				)}
			</div>
			
			{/* Team */}
			<div>
				<div className="flex justify-between mb-2">
					<span>Team Members</span>
					<span>{quota.teamMembers.used} / {quota.teamMembers.limit}</span>
				</div>
				<Progress value={quota.teamMembers.percentage} />
			</div>
			
			{/* Upgrade button if needed */}
			{quota.overall.status === "warning" && (
				<button className="w-full btn-primary">
					Upgrade Plan
				</button>
			)}
		</div>
	);
}
```

---

## 🔗 Related APIs

- [Billing API](./13-billing) - Subscription plans and pricing
- [Videos API](./04-videos) - Video storage usage
- [Projects API](./03-projects) - Project limits
- [Teams API](./08-teams) - Team member limits

---

## 🛡️ Security Considerations

1. **Server-side Enforcement** - Never trust client checks
2. **Race Conditions** - Use database transactions for quota checks
3. **Cache Invalidation** - Invalidate quota cache on usage changes
4. **Audit Trail** - Log quota violations
5. **Graceful Degradation** - Allow 5% grace period
6. **Rate Limiting** - Prevent quota check spam

---

## 📈 Monitoring & Alerts

### Quota Health Metrics

```typescript
// Track these metrics for monitoring
interface QuotaMetrics {
	// Users at 80%+ usage
	usersNearLimit: {
		videos: number;
		storage: number;
		teamMembers: number;
	};
	
	// Users exceeding limits
	usersExceeded: {
		videos: number;
		storage: number;
	};
	
	// Average usage by plan
	averageUsage: {
		free: { storage: number; videos: number };
		pro: { storage: number; videos: number };
		team: { storage: number; videos: number };
	};
	
	// Upgrade triggers
	upgradesTriggeredByQuota: number;
}
```

### Alerts

- Alert when >10% of users on a plan exceed 90% quota
- Alert when storage growth rate exceeds 20% week-over-week
- Alert on quota enforcement failures

---

**Last Updated:** November 22, 2025  
**API Version:** 1.0.0 (MVP)
