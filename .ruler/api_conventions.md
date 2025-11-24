# API Conventions

## Tech Stack

- **API Framework:** tRPC v11.5.0 (end-to-end type-safe APIs)
- **Server Framework:** Hono (fast, lightweight HTTP server)
- **Schema Validation:** Zod v3.24.1
- **ORM:** Drizzle ORM with SQLite/Turso

## tRPC Architecture

### Router Organization

All API logic lives in `packages/api/src/` with this structure:

```
packages/api/
├── context.ts          # Request context creation
├── init.ts             # tRPC initialization & middleware
├── root.ts             # Root router (exports appRouter)
└── routers/           # Individual feature routers
    ├── auth.ts
    ├── todo.ts
    └── ...
```

### Creating a New Router

1. **Create router file** in `packages/api/src/routers/`
2. **Define procedures** using `publicProcedure` or `protectedProcedure`
3. **Export router** and merge into root router

```typescript
// packages/api/src/routers/user.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../init";
import { db } from "@koko/db";
import { users } from "@koko/db/schema";
import { eq } from "drizzle-orm";

export const userRouter = router({
	getProfile: protectedProcedure
		.input(z.object({ userId: z.string().optional() }))
		.query(async ({ ctx, input }) => {
			const userId = input.userId ?? ctx.session.user.id;

			const user = await db.query.users.findFirst({
				where: eq(users.id, userId),
			});

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			return user;
		}),

	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				bio: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [updated] = await db
				.update(users)
				.set(input)
				.where(eq(users.id, ctx.session.user.id))
				.returning();

			return updated;
		}),
});
```

3. **Merge into root router:**

```typescript
// packages/api/src/root.ts
import { userRouter } from "./routers/user";

export const appRouter = router({
	auth: authRouter,
	todo: todoRouter,
	user: userRouter, // Add new router
});

export type AppRouter = typeof appRouter;
```

### Procedure Types

#### Public Procedure

Use for **unauthenticated** endpoints (login, signup, public data):

```typescript
import { db } from "@koko/db";
import { posts } from "@koko/db/schema";
import { eq, desc } from "drizzle-orm";

export const publicRouter = router({
	getPublicPosts: publicProcedure
		.input(z.object({ limit: z.number().min(1).max(100).default(10) }))
		.query(async ({ ctx, input }) => {
			return db.query.posts.findMany({
				where: eq(posts.published, true),
				limit: input.limit,
				orderBy: [desc(posts.createdAt)],
			});
		}),
});
```

#### Protected Procedure

Use for **authenticated** endpoints (requires valid session):

```typescript
import { db } from "@koko/db";
import { posts } from "@koko/db/schema";

export const privateRouter = router({
	createPost: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1).max(200),
				content: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// ctx.session.user is guaranteed to exist
			const [post] = await db
				.insert(posts)
				.values({
					...input,
					authorId: ctx.session.user.id,
				})
				.returning();

			return post;
		}),
});
```

### Input Validation with Zod

**Always validate inputs** using Zod schemas:

```typescript
// Good - Strict validation
.input(
	z.object({
		email: z.string().email(),
		age: z.number().int().min(0).max(120),
		role: z.enum(["user", "admin", "moderator"]),
		tags: z.array(z.string()).max(10),
		metadata: z.record(z.string(), z.unknown()).optional(),
	}),
)

// Bad - No validation
.input(z.any())
```

**Extract reusable schemas:**

```typescript
// packages/api/src/schemas/user.ts
export const createUserSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1).max(100),
	password: z.string().min(8).max(72),
});

export const updateUserSchema = createUserSchema.partial();

// Usage in router
.input(createUserSchema)
```

### Context Usage

The `ctx` parameter provides:

- `ctx.db` - Drizzle database instance
- `ctx.session` - Current user session (if authenticated)
- `ctx.headers` - Request headers

**Never mutate context** - treat it as read-only.

```typescript
import { db } from "@koko/db";
import { users } from "@koko/db/schema";
import { eq } from "drizzle-orm";

// Good
const userId = ctx.session.user.id;
const user = await db.query.users.findFirst({
	where: eq(users.id, userId),
});

// Bad
ctx.session.user.id = "new-id"; // Never modify context
```

### Error Handling

Use **TRPCError** for all errors:

```typescript
import { TRPCError } from "@trpc/server";

// Common error codes
throw new TRPCError({
	code: "NOT_FOUND",
	message: "Resource not found",
});

throw new TRPCError({
	code: "BAD_REQUEST",
	message: "Invalid input data",
});

throw new TRPCError({
	code: "UNAUTHORIZED",
	message: "You must be logged in",
});

throw new TRPCError({
	code: "FORBIDDEN",
	message: "You don't have permission",
});

throw new TRPCError({
	code: "INTERNAL_SERVER_ERROR",
	message: "Something went wrong",
});

throw new TRPCError({
	code: "CONFLICT",
	message: "Resource already exists",
});
```

**Available error codes:**
- `BAD_REQUEST` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `TIMEOUT` (408)
- `CONFLICT` (409)
- `PRECONDITION_FAILED` (412)
- `PAYLOAD_TOO_LARGE` (413)
- `TOO_MANY_REQUESTS` (429)
- `CLIENT_CLOSED_REQUEST` (499)
- `INTERNAL_SERVER_ERROR` (500)

### Query vs Mutation

**Query** - For reading data (GET semantics):

```typescript
import { db } from "@koko/db";
import { users } from "@koko/db/schema";
import { eq } from "drizzle-orm";

getUser: protectedProcedure
	.input(z.object({ id: z.string() }))
	.query(async ({ ctx, input }) => {
		return db.query.users.findFirst({
			where: eq(users.id, input.id),
		});
	}),
```

**Mutation** - For writing data (POST/PUT/DELETE semantics):

```typescript
import { db } from "@koko/db";
import { users } from "@koko/db/schema";
import { eq } from "drizzle-orm";

deleteUser: protectedProcedure
	.input(z.object({ id: z.string() }))
	.mutation(async ({ ctx, input }) => {
		await db.delete(users).where(eq(users.id, input.id));
		return { success: true };
	}),
```

### Pagination Patterns

Use **cursor-based pagination** for infinite scrolling:

```typescript
import { db } from "@koko/db";
import { posts } from "@koko/db/schema";
import { gt, desc } from "drizzle-orm";

getPosts: publicProcedure
	.input(
		z.object({
			limit: z.number().min(1).max(100).default(20),
			cursor: z.string().optional(),
		}),
	)
	.query(async ({ ctx, input }) => {
		const items = await db.query.posts.findMany({
			where: input.cursor ? gt(posts.id, input.cursor) : undefined,
			limit: input.limit + 1,
			orderBy: [desc(posts.createdAt)],
		});

		let nextCursor: string | undefined = undefined;
		if (items.length > input.limit) {
			const nextItem = items.pop();
			nextCursor = nextItem?.id;
		}

		return {
			items,
			nextCursor,
		};
	}),
```

Use **offset-based pagination** for page numbers:

```typescript
import { db } from "@koko/db";
import { users } from "@koko/db/schema";
import { count } from "drizzle-orm";

getUsers: publicProcedure
	.input(
		z.object({
			page: z.number().min(1).default(1),
			pageSize: z.number().min(1).max(100).default(20),
		}),
	)
	.query(async ({ ctx, input }) => {
		const offset = (input.page - 1) * input.pageSize;

		const [items, [{ value: total }]] = await Promise.all([
			db.query.users.findMany({
				limit: input.pageSize,
				offset,
			}),
			db.select({ value: count() }).from(users),
		]);

		return {
			items,
			total,
			page: input.page,
			pageSize: input.pageSize,
			totalPages: Math.ceil(total / input.pageSize),
		};
	}),
```

## Hono Server Setup

The tRPC API is mounted on a Hono server in `apps/server/`:

```typescript
// apps/server/src/index.ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter, createContext } from "@koko/api";

const app = new Hono();

// CORS configuration
app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3001"],
		credentials: true,
	})
);

// tRPC endpoint
app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext,
	})
);

// Health check
app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

// Start server
const port = 3000;
console.log(`Server running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
```

### CORS Configuration

- **Always set explicit origins** (never use `*` in production)
- **Enable credentials** for cookie-based auth
- **Allow specific headers** if needed

### Endpoint Structure

- `/trpc/*` - tRPC API endpoints
- `/api/auth/*` - Better-Auth endpoints
- `/health` - Health check endpoint

## Frontend API Usage

### tRPC Client Setup

The tRPC client is configured in `apps/web/src/lib/trpc.ts`:

```typescript
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@koko/api";

export const trpc = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${import.meta.env.VITE_SERVER_URL}/trpc`,
			credentials: "include",
		}),
	],
});
```

### TanStack Query Integration

Use TanStack Query for data fetching in components:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

function UserProfile() {
	// Query
	const { data: user, isLoading } = useQuery({
		queryKey: ["user", "profile"],
		queryFn: () => trpc.user.getProfile.query(),
	});

	const queryClient = useQueryClient();

	// Mutation
	const updateProfile = useMutation({
		mutationFn: (input: { name: string; bio?: string }) =>
			trpc.user.updateProfile.mutate(input),
		onSuccess: () => {
			// Invalidate and refetch
			queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
		},
	});

	if (isLoading) return <div>Loading...</div>;

	return (
		<div>
			<h1>{user?.name}</h1>
			<button onClick={() => updateProfile.mutate({ name: "New Name" })}>
				Update
			</button>
		</div>
	);
}
```

## Best Practices

1. **Keep routers focused** - One router per domain/feature
2. **Validate all inputs** - Use Zod schemas
3. **Use proper error codes** - Consistent error handling
4. **Type everything** - Leverage end-to-end type safety
5. **Extract complex logic** - Keep procedures thin, business logic in services
6. **Use transactions** for multi-step operations
7. **Implement caching** - Use TanStack Query properly
8. **Document complex procedures** - Add JSDoc comments
9. **Test procedures** - Unit test business logic
10. **Monitor performance** - Log slow queries

## Security Considerations

1. **Always validate inputs** - Never trust client data
2. **Use protectedProcedure** for authenticated endpoints
3. **Check permissions** - Verify user can access resource
4. **Sanitize outputs** - Don't leak sensitive data
5. **Rate limit** - Prevent abuse (implement middleware)
6. **Audit logs** - Track sensitive operations

```typescript
import { Post } from "@novi/db";

// Good - Permission check
deletePost: protectedProcedure
	.input(z.object({ id: z.string() }))
	.mutation(async ({ ctx, input }) => {
		const post = await Post.findById(input.id);

		if (!post) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Post not found",
			});
		}

		if (post.authorId !== ctx.session.user.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only delete your own posts",
			});
		}

		return Post.findByIdAndDelete(input.id);
	}),
```
