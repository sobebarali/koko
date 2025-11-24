---
title: Search & Discovery API
description: Unified search across videos, projects, comments, and users
---

# 🔍 Search & Discovery API

## Overview

The Search API provides unified, fast search across all Artellio resources (videos, projects, comments, users, tags). Uses full-text search with MongoDB Atlas Search or Elasticsearch for production.

## 📋 Growth Phase Endpoints

### `search.global` - Global Search

Search across all resources in one query (Google-style).

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const globalSearchSchema = z.object({
	// Search query
	query: z.string().min(1).max(200),
	
	// Filters
	filters: z.object({
		// Resource types to search
		types: z.array(
			z.enum(["videos", "projects", "comments", "users", "teams"])
		).optional(),
		
		// Date range
		dateRange: z.object({
			from: z.date(),
			to: z.date(),
		}).optional(),
		
		// Project filter
		projectId: z.string().optional(),
		
		// User filter
		userId: z.string().optional(),
	}).optional(),
	
	// Pagination
	limit: z.number().min(1).max(50).default(20),
	offset: z.number().default(0),
});
```

#### Output Schema

```typescript
interface GlobalSearchOutput {
	query: string;
	totalResults: number;
	executionTime: number; // milliseconds
	
	// Grouped results
	results: {
		// Videos
		videos: {
			total: number;
			items: {
				id: string;
				title: string;
				description?: string;
				thumbnailUrl: string;
				projectId: string;
				projectName: string;
				duration: number;
				createdAt: Date;
				
				// Search relevance
				score: number; // 0-1
				matchedFields: string[]; // ["title", "description"]
				highlight?: string; // Snippet with <mark> tags
			}[];
		};
		
		// Projects
		projects: {
			total: number;
			items: {
				id: string;
				name: string;
				description?: string;
				videoCount: number;
				createdAt: Date;
				score: number;
				matchedFields: string[];
				highlight?: string;
			}[];
		};
		
		// Comments
		comments: {
			total: number;
			items: {
				id: string;
				text: string;
				videoId: string;
				videoTitle: string;
				timecode?: number;
				author: { id: string; name: string };
				createdAt: Date;
				score: number;
				highlight?: string;
			}[];
		};
		
		// Users
		users: {
			total: number;
			items: {
				id: string;
				name: string;
				email: string;
				image?: string;
				score: number;
			}[];
		};
	};
	
	// Suggestions
	suggestions?: string[]; // "Did you mean..." suggestions
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

const results = await trpc.search.global.query({
	query: "product demo",
	filters: {
		types: ["videos", "projects"],
		dateRange: {
			from: new Date("2025-01-01"),
			to: new Date(),
		},
	},
	limit: 20,
});

console.log(`Found ${results.totalResults} results in ${results.executionTime}ms`);

// Display videos
results.results.videos.items.forEach((video) => {
	console.log(`${video.title} (score: ${video.score})`);
	console.log(`Matched: ${video.matchedFields.join(", ")}`);
	console.log(`Snippet: ${video.highlight}`);
});

// Show suggestions
if (results.suggestions?.length) {
	console.log("Did you mean:", results.suggestions[0]);
}
```

#### Business Rules

1. **Permission Filtering** - Only return resources user has access to
2. **Fuzzy Matching** - Typo tolerance (Levenshtein distance)
3. **Relevance Scoring** - Weighted by field (title > description > content)
4. **Highlighting** - Return snippets with `<mark>` tags around matches
5. **Suggestions** - Spell check and alternative queries

---

### `search.videos` - Video-Specific Search

Advanced video search with filters.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const searchVideosSchema = z.object({
	query: z.string().min(1).max(200),
	
	// Filters
	filters: z.object({
		projectId: z.string().optional(),
		tags: z.array(z.string()).optional(),
		status: z.enum(["uploading", "processing", "ready", "failed"]).optional(),
		
		// Duration filter
		durationMin: z.number().optional(), // seconds
		durationMax: z.number().optional(),
		
		// Date range
		uploadedAfter: z.date().optional(),
		uploadedBefore: z.date().optional(),
		
		// Resolution
		resolution: z.enum(["SD", "HD", "FHD", "4K"]).optional(),
	}).optional(),
	
	// Sorting
	sortBy: z.enum(["relevance", "date", "title", "duration", "views"]).default("relevance"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	
	// Pagination
	limit: z.number().min(1).max(100).default(20),
	cursor: z.string().optional(),
});
```

#### Output Schema

```typescript
interface SearchVideosOutput {
	videos: {
		id: string;
		title: string;
		description?: string;
		thumbnailUrl: string;
		streamingUrl: string;
		projectId: string;
		projectName: string;
		duration: number;
		resolution: string;
		status: string;
		tags: string[];
		uploadedAt: Date;
		views: number;
		
		// Search metadata
		score: number;
		matchedFields: string[];
		highlight?: string;
	}[];
	
	nextCursor?: string;
	total: number;
}
```

#### Usage Example

```typescript
// Search for 4K videos uploaded this month
const results = await trpc.search.videos.query({
	query: "product launch",
	filters: {
		resolution: "4K",
		uploadedAfter: new Date("2025-01-01"),
		status: "ready",
		tags: ["marketing", "product"],
	},
	sortBy: "date",
	sortOrder: "desc",
	limit: 50,
});
```

---

### `search.projects` - Project Search

Search projects by name, description, or metadata.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const searchProjectsSchema = z.object({
	query: z.string().min(1).max(200),
	
	filters: z.object({
		status: z.enum(["active", "archived"]).optional(),
		hasVideos: z.boolean().optional(),
		createdAfter: z.date().optional(),
	}).optional(),
	
	sortBy: z.enum(["relevance", "date", "name", "videoCount"]).default("relevance"),
	limit: z.number().min(1).max(100).default(20),
});
```

---

### `search.comments` - Comment Search

Search comments and annotations.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const searchCommentsSchema = z.object({
	query: z.string().min(1).max(200),
	
	filters: z.object({
		videoId: z.string().optional(),
		projectId: z.string().optional(),
		authorId: z.string().optional(),
		status: z.enum(["open", "resolved"]).optional(),
		createdAfter: z.date().optional(),
	}).optional(),
	
	limit: z.number().min(1).max(100).default(20),
});
```

#### Output Schema

```typescript
interface SearchCommentsOutput {
	comments: {
		id: string;
		text: string;
		timecode?: number;
		videoId: string;
		videoTitle: string;
		thumbnailUrl: string;
		author: { id: string; name: string; image?: string };
		status: "open" | "resolved";
		createdAt: Date;
		
		// Search metadata
		score: number;
		highlight: string;
	}[];
	
	total: number;
}
```

---

### 🎯 `search.advanced` - Advanced Search (Scale Phase)

Complex queries with boolean operators, faceting, and aggregations.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const advancedSearchSchema = z.object({
	// Boolean query
	query: z.object({
		must: z.array(z.string()).optional(), // AND
		should: z.array(z.string()).optional(), // OR
		mustNot: z.array(z.string()).optional(), // NOT
	}),
	
	// Facets (aggregations)
	facets: z.array(
		z.enum(["tags", "projects", "users", "dates", "resolution"])
	).optional(),
	
	// Advanced filters
	filters: z.object({
		customFields: z.record(z.unknown()).optional(),
		geoLocation: z.object({
			lat: z.number(),
			lng: z.number(),
			radiusKm: z.number(),
		}).optional(),
	}).optional(),
});
```

#### Example Query

```typescript
// Boolean search: "product demo" AND (marketing OR sales) NOT internal
const results = await trpc.search.advanced.query({
	query: {
		must: ["product demo"],
		should: ["marketing", "sales"],
		mustNot: ["internal"],
	},
	facets: ["tags", "projects", "dates"],
});

// Results include facet counts
console.log("Tags:", results.facets.tags);
// { "marketing": 45, "sales": 32, "product": 78 }
```

---

### 🎯 `search.suggestions` - AI-Powered Suggestions (Scale Phase)

Get AI-powered search suggestions and related content.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const suggestionsSchema = z.object({
	// Partial query (autocomplete)
	query: z.string().min(1).max(100),
	
	// Context
	context: z.object({
		currentProjectId: z.string().optional(),
		recentSearches: z.array(z.string()).optional(),
	}).optional(),
	
	limit: z.number().min(1).max(10).default(5),
});
```

#### Output Schema

```typescript
interface SuggestionsOutput {
	suggestions: {
		text: string;
		type: "query" | "video" | "project" | "tag";
		score: number;
		metadata?: {
			videoCount?: number;
			thumbnail?: string;
		};
	}[];
	
	// Related searches
	related: string[];
}
```

#### Usage Example

```typescript
// Autocomplete as user types
const suggestions = await trpc.search.suggestions.query({
	query: "prod", // User typed "prod"
	limit: 5,
});

// Suggestions:
// 1. "product demo" (query)
// 2. "Product Launch Video" (video)
// 3. "Products 2025" (project)
// 4. "production" (tag)
```

---

## 🔧 Search Implementation

### MongoDB Atlas Search

```typescript
// Server-side search implementation
import { db } from "@artellio/db";

export async function searchVideos(userId: string, query: string) {
	const results = await db.video.aggregatePipeline([
		{
			$search: {
				index: "videos_search",
				text: {
					query: query,
					path: ["title", "description", "tags"],
					fuzzy: {
						maxEdits: 2,
						prefixLength: 3,
					},
				},
			},
		},
		{
			$match: {
				// Permission filter
				$or: [
					{ userId: userId },
					{ "collaborators.userId": userId },
				],
			},
		},
		{
			$addFields: {
				score: { $meta: "searchScore" },
			},
		},
		{
			$sort: { score: -1 },
		},
		{
			$limit: 20,
		},
		{
			$lookup: {
				from: "projects",
				localField: "projectId",
				foreignField: "_id",
				as: "project",
			},
		},
	]);
	
	return results;
}
```

### Search Index Definition

```json
{
	"mappings": {
		"dynamic": false,
		"fields": {
			"title": {
				"type": "string",
				"analyzer": "lucene.english"
			},
			"description": {
				"type": "string",
				"analyzer": "lucene.english"
			},
			"tags": {
				"type": "string",
				"analyzer": "lucene.keyword"
			},
			"uploadedAt": {
				"type": "date"
			},
			"userId": {
				"type": "string"
			}
		}
	}
}
```

---

## 🎨 Frontend Integration

### Search Component

```typescript
import { trpc } from "@/lib/trpc";
import { useDebouncedCallback } from "use-debounce";
import { useState } from "react";

export function GlobalSearch() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState(null);
	
	const performSearch = useDebouncedCallback(async (searchQuery: string) => {
		if (searchQuery.length < 2) return;
		
		const data = await trpc.search.global.query({
			query: searchQuery,
			limit: 20,
		});
		
		setResults(data);
	}, 300);
	
	return (
		<div>
			<input
				type="search"
				placeholder="Search videos, projects, comments..."
				value={query}
				onChange={(e) => {
					setQuery(e.target.value);
					performSearch(e.target.value);
				}}
			/>
			
			{results && (
				<div className="search-results">
					{/* Videos */}
					{results.results.videos.total > 0 && (
						<section>
							<h3>Videos ({results.results.videos.total})</h3>
							{results.results.videos.items.map((video) => (
								<div key={video.id} className="result-item">
									<img src={video.thumbnailUrl} />
									<div>
										<h4>{video.title}</h4>
										<p dangerouslySetInnerHTML={{ __html: video.highlight }} />
									</div>
								</div>
							))}
						</section>
					)}
					
					{/* Projects, Comments, etc. */}
				</div>
			)}
		</div>
	);
}
```

---

## 📊 Search Analytics

Track search queries for insights:

```typescript
// Log search query
await db.searchLog.create({
	data: {
		userId: user.id,
		query: input.query,
		resultsCount: results.totalResults,
		executionTime: results.executionTime,
		clicked: null, // Updated if user clicks result
		timestamp: new Date(),
	},
});

// Analyze popular searches
const popularSearches = await db.searchLog.groupBy({
	by: ["query"],
	_count: { query: true },
	orderBy: { _count: { query: "desc" } },
	take: 10,
});
```

---

## 🔗 Related APIs

- [Videos API](./04-videos) - Video metadata
- [Projects API](./03-projects) - Project data
- [Comments API](./05-comments) - Comment search
- [Tags API](./17-tags) - Tag-based filtering

---

## 🛡️ Security Considerations

1. **Permission Filtering** - Always filter results by user permissions
2. **Query Sanitization** - Prevent injection attacks
3. **Rate Limiting** - Max 100 searches per hour per user
4. **PII Protection** - Exclude sensitive fields from search index
5. **Audit Logging** - Log all searches for compliance

---

## 🚀 Performance Optimization

1. **Indexing** - Create search indexes on all searchable fields
2. **Caching** - Cache popular search results (Redis, 5 min TTL)
3. **Debouncing** - Debounce frontend queries (300ms)
4. **Pagination** - Limit results to 100 per page
5. **Async Processing** - Index updates happen asynchronously

---

**Last Updated:** November 22, 2025  
**API Version:** 1.0.0 (Growth Phase)
