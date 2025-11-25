# Development Patterns

## tRPC API

### Router Structure
```
packages/api/src/
├── root.ts       # appRouter (merges all routers)
├── init.ts       # tRPC setup & middleware
├── context.ts    # Request context
└── routers/      # Feature routers
```

### Procedure Types

**Public** (unauthenticated):
```typescript
export const publicRouter = router({
  getPosts: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return db.query.posts.findMany({ limit: input.limit });
    }),
});
```

**Protected** (authenticated):
```typescript
export const privateRouter = router({
  createPost: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      return db.insert(posts).values({
        ...input,
        authorId: ctx.session.user.id,
      }).returning();
    }),
});
```

### Error Codes

| Code | HTTP | Use Case |
|------|------|----------|
| `BAD_REQUEST` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource missing |
| `CONFLICT` | 409 | Already exists |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

```typescript
throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
```

### Permission Check Pattern
```typescript
deletePost: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, input.id),
    });
    if (!post) throw new TRPCError({ code: "NOT_FOUND" });
    if (post.authorId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return db.delete(posts).where(eq(posts.id, input.id));
  }),
```

---

## Drizzle ORM (SQLite/Turso)

### Schema Definition
```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const post = sqliteTable(
  "post",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("post_author_idx").on(t.authorId)]
);
```

### Column Types

| Type | Drizzle | Notes |
|------|---------|-------|
| String | `text("col")` | Primary keys, text |
| Number | `integer("col")` | Auto-increment, counts |
| Boolean | `integer("col", { mode: "boolean" })` | Stored as 0/1 |
| Timestamp | `integer("col", { mode: "timestamp_ms" })` | Milliseconds |
| JSON | `text("col", { mode: "json" }).$type<T>()` | Typed JSON |
| Enum | `text("col", { enum: ["a", "b"] })` | String enum |

### Relations
```typescript
import { relations } from "drizzle-orm";

export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
}));

export const postRelations = relations(post, ({ one }) => ({
  author: one(user, {
    fields: [post.authorId],
    references: [user.id],
  }),
}));
```

### CRUD Operations

```typescript
// Create
const [newUser] = await db.insert(user).values({ id: "1", name: "John", email: "j@e.com" }).returning();

// Read
const users = await db.select().from(user).where(eq(user.email, "j@e.com"));
const userWithPosts = await db.query.user.findFirst({
  where: eq(user.id, "1"),
  with: { posts: true },
});

// Update
await db.update(user).set({ name: "Jane" }).where(eq(user.id, "1"));

// Delete
await db.delete(user).where(eq(user.id, "1"));
```

### Filters

| Operator | Import | Example |
|----------|--------|---------|
| Equal | `eq` | `eq(col, value)` |
| Not equal | `ne` | `ne(col, value)` |
| Greater | `gt`, `gte` | `gt(col, 100)` |
| Less | `lt`, `lte` | `lt(col, 100)` |
| Like | `like` | `like(col, "%search%")` |
| In | `inArray` | `inArray(col, [1,2,3])` |
| Null | `isNull`, `isNotNull` | `isNull(col)` |
| Combine | `and`, `or`, `not` | `and(eq(a,1), eq(b,2))` |

### Pagination (Cursor-based)
```typescript
const items = await db.select().from(post)
  .where(cursor ? gt(post.id, cursor) : undefined)
  .orderBy(desc(post.createdAt))
  .limit(limit + 1);

const nextCursor = items.length > limit ? items.pop()?.id : undefined;
return { items, nextCursor };
```

### Commands
```bash
npm run db:push      # Push schema to DB
npm run db:generate  # Generate migrations
npm run db:studio    # Open Drizzle Studio
```

---

## React Frontend

### Component Pattern
```typescript
interface UserCardProps {
  user: User;
  onEdit?: (id: string) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{user.name}</h3>
      {onEdit && <button onClick={() => onEdit(user.id)}>Edit</button>}
    </div>
  );
}
```

### TanStack Query
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function UserProfile() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user", "profile"],
    queryFn: () => trpc.user.getProfile.query(),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { name: string }) => trpc.user.update.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user"] }),
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{data?.name}</div>;
}
```

### Query Keys
```typescript
["users"]                    // All users
["users", { filter: "active" }]  // Filtered
["users", userId]            // Single user
["users", userId, "posts"]   // User's posts
```

### TanStack Router

**File structure:**
```
src/routes/
├── __root.tsx    # Root layout
├── index.tsx     # /
├── about.tsx     # /about
└── users/
    ├── index.tsx # /users
    └── $id.tsx   # /users/:id
```

**Route with loader:**
```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/users/$id")({
  loader: async ({ params, context }) => {
    return context.queryClient.ensureQueryData({
      queryKey: ["user", params.id],
      queryFn: () => trpc.user.getById.query({ id: params.id }),
    });
  },
  component: UserDetail,
});

function UserDetail() {
  const { id } = Route.useParams();
  const data = Route.useLoaderData();
  return <div>{data.name}</div>;
}
```

### Navigation
```typescript
import { Link, useNavigate } from "@tanstack/react-router";

<Link to="/users/$id" params={{ id: "123" }}>Profile</Link>

const navigate = useNavigate();
navigate({ to: "/dashboard" });
```

### Styling (TailwindCSS + cn)
```typescript
import { cn } from "@/lib/utils";

<button className={cn(
  "rounded-md px-4 py-2",
  variant === "primary" && "bg-blue-500 text-white",
  disabled && "opacity-50"
)} />
```
