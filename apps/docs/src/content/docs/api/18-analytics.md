---
title: Analytics API
description: Video engagement metrics, team collaboration insights, and custom reporting
---

# Analytics API

## Overview

The Analytics API provides comprehensive insights into video engagement, team collaboration, and platform usage. Track view counts, watch time, completion rates, and generate custom reports for data-driven decision making.

**Phase:** 📋 Growth (Month 3-6)  
**Endpoints:** 5  
**Priority:** Medium - Valuable for customer retention and upsell

---

## Key Features

- **Video Performance Metrics** - Views, watch time, engagement
- **Team Collaboration Stats** - Comments, annotations, activity
- **Engagement Heatmaps** - Frame-level interest analysis (via Bunny Stream)
- **Custom Reports** - Exportable analytics (CSV/PDF)
- **Time-series Data** - Track metrics over time
- **Comparison Tools** - Compare videos, projects, time periods

---

## Endpoints

### 1. Get Analytics Overview

Get high-level dashboard metrics for a user or team.

```typescript
analytics.overview: protectedProcedure
  .input(
    z.object({
      timeRange: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
      projectId: z.string().optional(), // Filter to specific project
    })
  )
  .query()
```

#### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timeRange` | `enum` | No | Time period: `7d`, `30d`, `90d`, `all` (default: `30d`) |
| `projectId` | `string` | No | Filter to specific project (default: all projects) |

#### Response

```typescript
{
  summary: {
    totalViews: number;              // Total video views
    totalWatchTime: number;          // Total watch time (seconds)
    avgCompletionRate: number;       // Average % of videos watched (0-100)
    activeVideos: number;            // Videos with views in period
    totalComments: number;           // Comments created in period
    activeCollaborators: number;     // Unique users active in period
  };
  topVideos: Array<{
    id: string;
    title: string;
    projectName: string;
    views: number;
    watchTime: number;               // Total watch time (seconds)
    completionRate: number;          // Percentage (0-100)
    comments: number;
    thumbnail: string | null;
  }>;
  activityTimeline: Array<{
    date: string;                    // ISO date (YYYY-MM-DD)
    views: number;
    comments: number;
    uploads: number;
  }>;
  collaboratorActivity: Array<{
    userId: string;
    userName: string;
    avatar: string | null;
    comments: number;
    videosUploaded: number;
    lastActive: string;              // ISO DateTime
  }>;
}
```

#### Example

```typescript
const analytics = await trpc.analytics.overview.query({
  timeRange: '30d',
});

console.log(`Total views: ${analytics.summary.totalViews}`);
console.log(`Avg completion: ${analytics.summary.avgCompletionRate}%`);
console.log(`Top video: ${analytics.topVideos[0].title}`);
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - Insufficient permissions (team analytics)

---

### 2. Get Video Performance Metrics

Get detailed engagement metrics for a specific video.

```typescript
analytics.videoPerformance: protectedProcedure
  .input(
    z.object({
      videoId: z.string(),
      timeRange: z.enum(['7d', '30d', '90d', 'all']).default('all'),
      includeHeatmap: z.boolean().default(false), // Bunny Stream heatmap
    })
  )
  .query()
```

#### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `videoId` | `string` | Yes | Video ID |
| `timeRange` | `enum` | No | Time period (default: `all`) |
| `includeHeatmap` | `boolean` | No | Include engagement heatmap data (default: `false`) |

#### Response

```typescript
{
  videoId: string;
  title: string;
  duration: number;                  // Video duration (seconds)
  uploadedAt: string;                // ISO DateTime
  
  metrics: {
    totalViews: number;              // Unique + repeat views
    uniqueViews: number;             // Unique viewers
    totalWatchTime: number;          // Total seconds watched
    avgWatchTime: number;            // Average per viewer
    completionRate: number;          // % who watched to end (0-100)
    avgCompletionPercentage: number; // Avg % watched (0-100)
    comments: number;                // Total comments
    annotations: number;             // Total annotations
    shares: number;                  // Share link clicks
  };
  
  viewsByDate: Array<{
    date: string;                    // ISO date (YYYY-MM-DD)
    views: number;
    watchTime: number;
  }>;
  
  viewerRetention: Array<{
    timecode: number;                // Second marker (0, 10, 20, ...)
    percentageWatching: number;      // % still watching (0-100)
  }>;
  
  heatmap?: Array<{
    timecode: number;                // Second marker
    engagementScore: number;         // Interest level (0-100)
    rewatches: number;               // Times segment rewatched
  }>;
  
  topComments: Array<{
    id: string;
    text: string;
    timecode: number;
    author: string;
    createdAt: string;
    replies: number;
  }>;
  
  devices: {
    desktop: number;                 // % of views
    mobile: number;
    tablet: number;
  };
  
  geographicDistribution: Array<{
    country: string;
    countryCode: string;             // ISO 3166-1 alpha-2
    views: number;
    percentage: number;
  }>;
}
```

#### Example

```typescript
const performance = await trpc.analytics.videoPerformance.query({
  videoId: '507f1f77bcf86cd799439011',
  timeRange: '30d',
  includeHeatmap: true,
});

console.log(`Completion rate: ${performance.metrics.completionRate}%`);
console.log(`Unique viewers: ${performance.metrics.uniqueViews}`);

// Find drop-off points
const dropOff = performance.viewerRetention.find(
  point => point.percentageWatching < 50
);
console.log(`50% drop-off at ${dropOff?.timecode}s`);
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User doesn't have access to video
- `NOT_FOUND` - Video not found

#### Notes

- **Heatmap data** requires Bunny Stream analytics integration
- **Geographic data** may be limited by privacy settings
- **Device breakdown** based on User-Agent parsing
- Data refreshes every 15 minutes

---

### 3. Get Team Activity Metrics

Get collaboration metrics for a project or team.

```typescript
analytics.teamActivity: protectedProcedure
  .input(
    z.object({
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      timeRange: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
    })
  )
  .query()
```

#### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | `string` | No | Filter to specific project |
| `teamId` | `string` | No | Filter to specific team |
| `timeRange` | `enum` | No | Time period (default: `30d`) |

**Note:** Must provide `projectId` OR `teamId`, not both.

#### Response

```typescript
{
  summary: {
    activeMembers: number;           // Members active in period
    totalComments: number;
    totalAnnotations: number;
    videosUploaded: number;
    avgResponseTime: number;         // Avg time to first comment (seconds)
    collaborationScore: number;      // Overall engagement (0-100)
  };
  
  memberActivity: Array<{
    userId: string;
    userName: string;
    avatar: string | null;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    
    metrics: {
      commentsCreated: number;
      annotationsCreated: number;
      videosUploaded: number;
      videosViewed: number;
      repliesReceived: number;
      avgResponseTime: number;       // Seconds to reply
    };
    
    lastActive: string;              // ISO DateTime
    activityDays: number;            // Days active in period
  }>;
  
  commentActivity: Array<{
    date: string;                    // ISO date
    comments: number;
    annotations: number;
    resolvedComments: number;
  }>;
  
  responseTimeDistribution: {
    under1Hour: number;              // Count of comments
    under24Hours: number;
    under7Days: number;
    over7Days: number;
  };
  
  mostActiveVideos: Array<{
    videoId: string;
    title: string;
    comments: number;
    annotations: number;
    contributors: number;            // Unique commenters
  }>;
  
  peakActivityHours: Array<{
    hour: number;                    // 0-23 (UTC)
    comments: number;
    uploads: number;
  }>;
}
```

#### Example

```typescript
const teamStats = await trpc.analytics.teamActivity.query({
  projectId: '507f1f77bcf86cd799439011',
  timeRange: '30d',
});

console.log(`Active members: ${teamStats.summary.activeMembers}`);
console.log(`Collaboration score: ${teamStats.summary.collaborationScore}/100`);

// Find most engaged member
const topContributor = teamStats.memberActivity[0];
console.log(`Top contributor: ${topContributor.userName}`);
console.log(`Comments: ${topContributor.metrics.commentsCreated}`);
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User doesn't have access to project/team
- `BAD_REQUEST` - Missing both `projectId` and `teamId`
- `NOT_FOUND` - Project/team not found

---

### 4. Export Analytics Report

Generate and download analytics report in CSV or PDF format.

```typescript
analytics.export: protectedProcedure
  .input(
    z.object({
      reportType: z.enum(['overview', 'video', 'team']),
      format: z.enum(['csv', 'pdf']),
      timeRange: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
      
      // Type-specific filters
      videoId: z.string().optional(),      // Required if reportType = 'video'
      projectId: z.string().optional(),    // For 'overview' or 'team'
      teamId: z.string().optional(),       // For 'team'
    })
  )
  .mutation()
```

#### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reportType` | `enum` | Yes | Report type: `overview`, `video`, `team` |
| `format` | `enum` | Yes | Export format: `csv` or `pdf` |
| `timeRange` | `enum` | No | Time period (default: `30d`) |
| `videoId` | `string` | Conditional | Required if `reportType = 'video'` |
| `projectId` | `string` | No | Filter to project |
| `teamId` | `string` | No | Filter to team |

#### Response

```typescript
{
  downloadUrl: string;               // Pre-signed S3 URL (expires in 1 hour)
  fileName: string;                  // e.g., "analytics-overview-2025-01-15.pdf"
  fileSize: number;                  // Bytes
  expiresAt: string;                 // ISO DateTime
  format: 'csv' | 'pdf';
}
```

#### Example

```typescript
// Export PDF report for video
const report = await trpc.analytics.export.mutate({
  reportType: 'video',
  format: 'pdf',
  videoId: '507f1f77bcf86cd799439011',
  timeRange: '30d',
});

// Download report
window.open(report.downloadUrl, '_blank');

// Or fetch programmatically
const response = await fetch(report.downloadUrl);
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = report.fileName;
a.click();
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User doesn't have access to resource
- `BAD_REQUEST` - Invalid input (missing required fields)
- `NOT_FOUND` - Video/project/team not found
- `INTERNAL_SERVER_ERROR` - Report generation failed

#### Notes

- Reports are generated asynchronously
- Large reports may take 30-60 seconds to generate
- Download URLs expire after 1 hour
- **PDF reports** include charts and visualizations
- **CSV reports** include raw data for custom analysis

---

### 5. Create Custom Report

Create a custom analytics report with specific metrics and filters.

```typescript
analytics.customReport: protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      
      metrics: z.array(
        z.enum([
          'views',
          'watchTime',
          'completionRate',
          'comments',
          'annotations',
          'shares',
          'uniqueViewers',
          'avgWatchTime',
        ])
      ).min(1).max(10),
      
      filters: z.object({
        projectIds: z.array(z.string()).optional(),
        videoIds: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
        dateRange: z.object({
          from: z.string(), // ISO date
          to: z.string(),
        }).optional(),
        tags: z.array(z.string()).optional(),
      }).optional(),
      
      groupBy: z.enum(['day', 'week', 'month', 'video', 'user', 'project']).optional(),
      
      schedule: z.object({
        frequency: z.enum(['daily', 'weekly', 'monthly']),
        recipients: z.array(z.string().email()),
        format: z.enum(['csv', 'pdf']),
      }).optional(), // If provided, schedule recurring report
    })
  )
  .mutation()
```

#### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Report name (1-100 chars) |
| `description` | `string` | No | Report description (max 500 chars) |
| `metrics` | `array` | Yes | Metrics to include (1-10 items) |
| `filters` | `object` | No | Data filters |
| `groupBy` | `enum` | No | Group results by dimension |
| `schedule` | `object` | No | Schedule recurring delivery |

#### Response

```typescript
{
  reportId: string;
  name: string;
  description: string | null;
  metrics: string[];
  filters: object;
  groupBy: string | null;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'csv' | 'pdf';
    nextRun: string;                 // ISO DateTime
  } | null;
  createdAt: string;
  createdBy: string;
  
  // First report generated immediately
  initialReport: {
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
  };
}
```

#### Example

```typescript
// Create custom engagement report
const customReport = await trpc.analytics.customReport.mutate({
  name: 'Weekly Engagement Summary',
  description: 'Track weekly video performance across all projects',
  
  metrics: ['views', 'watchTime', 'completionRate', 'comments'],
  
  filters: {
    dateRange: {
      from: '2025-01-01',
      to: '2025-01-31',
    },
    tags: ['product-demo', 'marketing'],
  },
  
  groupBy: 'week',
  
  schedule: {
    frequency: 'weekly',
    recipients: ['team@example.com'],
    format: 'pdf',
  },
});

console.log(`Report created: ${customReport.reportId}`);
console.log(`Next delivery: ${customReport.schedule?.nextRun}`);

// Download initial report
window.open(customReport.initialReport.downloadUrl, '_blank');
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User doesn't have access to filtered resources
- `BAD_REQUEST` - Invalid input (empty metrics, invalid date range)
- `PAYLOAD_TOO_LARGE` - Too many filters (would generate huge report)

#### Notes

- **Scheduled reports** sent via email at specified frequency
- **First report** generated immediately on creation
- **Reports stored** for 30 days, then auto-deleted
- **Max 10 scheduled reports** per user
- Can update/delete scheduled reports via `customReport.update/delete` (future endpoints)

---

## Common Analytics Patterns

### 1. Dashboard Overview

Display high-level metrics on a dashboard:

```typescript
const { data: overview } = useQuery({
  queryKey: ['analytics', 'overview', timeRange],
  queryFn: () => trpc.analytics.overview.query({ timeRange }),
  staleTime: 1000 * 60 * 5, // Cache for 5 minutes
});
```

### 2. Video Performance Page

Show detailed metrics for a single video:

```typescript
const { data: performance } = useQuery({
  queryKey: ['analytics', 'video', videoId, timeRange],
  queryFn: () => trpc.analytics.videoPerformance.query({
    videoId,
    timeRange,
    includeHeatmap: true,
  }),
  staleTime: 1000 * 60 * 15, // Cache for 15 minutes
});

// Render retention curve
performance?.viewerRetention.map(point => ({
  x: point.timecode,
  y: point.percentageWatching,
}));
```

### 3. Team Collaboration Report

Track team activity and engagement:

```typescript
const { data: teamStats } = useQuery({
  queryKey: ['analytics', 'team', projectId, timeRange],
  queryFn: () => trpc.analytics.teamActivity.query({
    projectId,
    timeRange,
  }),
  staleTime: 1000 * 60 * 10,
});

// Leaderboard of most active members
teamStats?.memberActivity
  .sort((a, b) => b.metrics.commentsCreated - a.metrics.commentsCreated)
  .slice(0, 10);
```

### 4. Scheduled Weekly Report

Automatically send team reports every Monday:

```typescript
await trpc.analytics.customReport.mutate({
  name: 'Weekly Team Performance',
  metrics: ['views', 'comments', 'completionRate'],
  groupBy: 'video',
  schedule: {
    frequency: 'weekly',
    recipients: ['manager@example.com', 'team-lead@example.com'],
    format: 'pdf',
  },
});
```

---

## Bunny Stream Integration

### Video Analytics Data Source

Analytics data comes from two sources:

1. **Artellio Database** - Comments, annotations, shares, user activity
2. **Bunny Stream API** - Views, watch time, heatmaps, geographic data

### Syncing Bunny Stream Analytics

```typescript
// Backend: Sync analytics from Bunny Stream
const bunnyStats = await fetch(
  `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}/statistics`,
  {
    headers: {
      AccessKey: process.env.BUNNY_API_KEY,
    },
  }
);

const data = await bunnyStats.json();

// Store in database for faster queries
await db.videoAnalytics.upsert({
  where: { videoId },
  update: {
    totalViews: data.viewsTotal,
    watchTime: data.watchTimeTotal,
    heatmap: data.heatmap,
    lastSyncedAt: new Date(),
  },
  create: {
    videoId,
    totalViews: data.viewsTotal,
    watchTime: data.watchTimeTotal,
  },
});
```

### Engagement Heatmap

Bunny Stream provides frame-level engagement data:

```typescript
const heatmap = performance.heatmap?.map(point => ({
  time: point.timecode,
  engagement: point.engagementScore,
  color: point.engagementScore > 75 ? 'green' : 
         point.engagementScore > 50 ? 'yellow' : 'red',
}));

// Render heatmap overlay on video timeline
<VideoTimeline heatmap={heatmap} />
```

---

## Performance Considerations

### Caching Strategy

- **Overview queries:** Cache 5 minutes
- **Video performance:** Cache 15 minutes
- **Team activity:** Cache 10 minutes
- **Real-time dashboards:** Use polling or WebSocket updates

### Large Dataset Optimization

For large teams/projects:

```typescript
// Paginate member activity
const { data } = await trpc.analytics.teamActivity.query({
  projectId,
  pagination: {
    page: 1,
    pageSize: 50,
  },
});

// Only fetch top N videos
const topVideos = analytics.topVideos.slice(0, 10);
```

### Background Report Generation

Large reports generated asynchronously:

```typescript
// Request report generation
const { jobId } = await trpc.analytics.export.mutate({
  reportType: 'overview',
  format: 'pdf',
  timeRange: 'all',
});

// Poll for completion
const checkStatus = async () => {
  const { status, downloadUrl } = await trpc.analytics.getReportStatus.query({
    jobId,
  });
  
  if (status === 'completed') {
    window.open(downloadUrl, '_blank');
  } else if (status === 'processing') {
    setTimeout(checkStatus, 5000); // Check again in 5s
  }
};
```

---

## Privacy & Compliance

### Data Retention

- **Raw analytics data:** 90 days
- **Aggregated reports:** 1 year
- **Scheduled reports:** 30 days (auto-delete)

### GDPR Compliance

- **User deletion:** Analytics anonymized (userId → "deleted-user")
- **Data export:** Include analytics in GDPR export
- **Opt-out:** Users can disable personal analytics tracking

### Geographic Data

- **IP anonymization:** Last octet masked (192.168.1.xxx)
- **Country-level only:** No city/region tracking
- **Opt-in required:** For detailed geographic analytics

---

## Future Enhancements (Scale Phase)

- **AI Insights:** Automatic anomaly detection, trend predictions
- **A/B Testing:** Compare video performance across versions
- **Custom Dashboards:** Drag-and-drop widget builder
- **Real-time Alerts:** Notify on threshold breaches (views spike, low engagement)
- **Funnel Analysis:** Track viewer journey across multiple videos
- **Cohort Analysis:** Group viewers by behavior patterns
- **Benchmarking:** Compare performance against industry averages

---

**Last Updated:** November 22, 2025  
**API Version:** 1.0.0 (Growth Phase)
