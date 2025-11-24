# Database Guidelines

## Database Stack

- **Database:** SQLite/Turso (libSQL)
- **ORM:** Drizzle ORM
- **Schema Location:** `packages/db/src/schema/`
- **Connection Export:** `packages/db/src/index.ts`

## Drizzle Configuration

### Project Structure

The project uses a **schema-based organization** for better maintainability:

```
packages/db/
├── src/
│   ├── index.ts           # Drizzle connection & exports
│   └── schema/            # Drizzle schema definitions
│       ├── auth.ts        # Authentication tables
│       ├── todo.ts        # Todo tables
│       └── ...            # Additional domain schemas
├── drizzle.config.ts      # Drizzle Kit configuration
└── package.json
```

### Connection Setup

**`packages/db/src/index.ts`:**

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
	url: process.env.DATABASE_URL || "",
	authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle({ client });
```

**Connection Configuration:**
- Environment variable `DATABASE_URL` contains SQLite/Turso connection string
- Optional `DATABASE_AUTH_TOKEN` for Turso authentication
- Connection happens at module load
- Database instance exported for queries

### Schema Organization

Group related tables in separate files by domain:

**Authentication Schemas (`auth.ts`):**
- user
- session
- account
- verification

**Application Schemas (`todo.ts`, `post.ts`, etc.):**
- Domain-specific tables

## Schema Patterns

### Basic Table Definition

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.default(false)
		.notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull(),
});
```

### Column Types

**Common SQLite column types in Drizzle:**

```typescript
import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const exampleTable = sqliteTable("example", {
	// Text types
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	slug: text("slug").unique(),
	
	// Integer types
	age: integer("age"),
	views: integer("views").default(0).notNull(),
	
	// Boolean (stored as integer 0/1)
	isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
	emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
	
	// Timestamps (stored as milliseconds)
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.$onUpdate(() => new Date())
		.notNull(),
	publishedAt: integer("published_at", { mode: "timestamp_ms" }),
	
	// Real (floating point)
	price: real("price").default(0),
	rating: real("rating"),
	
	// Blob (binary data)
	avatar: blob("avatar"),
	
	// JSON (stored as text)
	metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
	settings: text("settings", { mode: "json" }).$type<{ theme: string; notifications: boolean }>(),
	
	// Enum (using text with check constraint)
	status: text("status", { enum: ["draft", "published", "archived"] }).default("draft").notNull(),
});
```

### Indexes

**Add indexes for queried fields:**

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const post = sqliteTable(
	"post",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		title: text("title").notNull(),
		slug: text("slug").unique().notNull(),
		authorId: text("author_id").notNull(),
		categoryId: integer("category_id"),
		publishedAt: integer("published_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [
		// Single field indexes
		index("post_slug_idx").on(table.slug),
		index("post_author_idx").on(table.authorId),
		index("post_created_idx").on(table.createdAt),
		index("post_published_idx").on(table.publishedAt),
		
		// Compound indexes
		index("post_author_published_idx").on(table.authorId, table.publishedAt),
		index("post_category_created_idx").on(table.categoryId, table.createdAt),
		
		// Unique compound index
		index("post_user_project_idx").on(table.authorId, table.categoryId).unique(),
	]
);
```

### Foreign Keys & References

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
});

export const post = sqliteTable(
	"post",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		title: text("title").notNull(),
		content: text("content"),
		authorId: text("author_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("post_author_idx").on(table.authorId)]
);
```

**Reference Options:**
- `onDelete: "cascade"` - Delete posts when user is deleted
- `onDelete: "set null"` - Set authorId to null when user is deleted
- `onDelete: "restrict"` - Prevent user deletion if posts exist
- `onUpdate: "cascade"` - Update references when user.id changes

### Relationships (Relations)

Drizzle uses a separate `relations()` function to define relationships:

#### One-to-Many

```typescript
import { relations } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull(),
});

export const post = sqliteTable("post", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	title: text("title").notNull(),
	content: text("content"),
	authorId: text("author_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

// Define relations
export const userRelations = relations(user, ({ many }) => ({
	posts: many(post),
}));

export const postRelations = relations(post, ({ one }) => ({
	author: one(user, {
		fields: [post.authorId],
		references: [user.id],
	}),
}));

// Usage with relational queries
import { db } from "@koko/db";

const userWithPosts = await db.query.user.findFirst({
	where: eq(user.id, userId),
	with: {
		posts: true,
	},
});
```

#### One-to-One

```typescript
export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull(),
});

export const profile = sqliteTable("profile", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	bio: text("bio"),
	avatar: text("avatar"),
	website: text("website"),
});

export const userRelations = relations(user, ({ one }) => ({
	profile: one(profile, {
		fields: [user.id],
		references: [profile.userId],
	}),
}));

export const profileRelations = relations(profile, ({ one }) => ({
	user: one(user, {
		fields: [profile.userId],
		references: [user.id],
	}),
}));
```

#### Many-to-Many

**Using join table:**

```typescript
export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
});

export const project = sqliteTable("project", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
});

export const membership = sqliteTable("membership", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	projectId: integer("project_id")
		.notNull()
		.references(() => project.id, { onDelete: "cascade" }),
	role: text("role", { enum: ["owner", "admin", "member"] }).default("member").notNull(),
	joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
	memberships: many(membership),
}));

export const projectRelations = relations(project, ({ many }) => ({
	memberships: many(membership),
}));

export const membershipRelations = relations(membership, ({ one }) => ({
	user: one(user, {
		fields: [membership.userId],
		references: [user.id],
	}),
	project: one(project, {
		fields: [membership.projectId],
		references: [project.id],
	}),
}));

// Usage
const userProjects = await db.query.user.findFirst({
	where: eq(user.id, userId),
	with: {
		memberships: {
			with: {
				project: true,
			},
		},
	},
});
```

## Drizzle Query API

### CRUD Operations

#### Create

```typescript
import { db } from "@koko/db";
import { user } from "@koko/db/schema";

// Single insert
const [newUser] = await db
	.insert(user)
	.values({
		id: crypto.randomUUID(),
		name: "John Doe",
		email: "john@example.com",
		emailVerified: false,
	})
	.returning();

// Multiple inserts
const users = await db
	.insert(user)
	.values([
		{ id: "1", name: "User 1", email: "user1@example.com" },
		{ id: "2", name: "User 2", email: "user2@example.com" },
	])
	.returning();

// Insert with default values
const [user] = await db
	.insert(user)
	.values({
		id: crypto.randomUUID(),
		name: "Jane Doe",
		email: "jane@example.com",
	})
	.returning();
```

#### Read

```typescript
import { db } from "@koko/db";
import { user, post } from "@koko/db/schema";
import { eq, and, or, like, gt, desc } from "drizzle-orm";

// Find all
const users = await db.select().from(user);

// Find with condition
const verifiedUsers = await db
	.select()
	.from(user)
	.where(eq(user.emailVerified, true));

// Find with multiple conditions
const posts = await db
	.select()
	.from(post)
	.where(
		and(
			eq(post.authorId, userId),
			eq(post.published, true)
		)
	)
	.orderBy(desc(post.createdAt))
	.limit(10);

// Select specific columns
const userEmails = await db
	.select({
		email: user.email,
		name: user.name,
	})
	.from(user);

// Count
const [{ count }] = await db
	.select({ count: sql<number>`count(*)` })
	.from(user)
	.where(eq(user.emailVerified, true));

// Exists
const userExists = await db.query.user.findFirst({
	where: eq(user.email, "user@example.com"),
	columns: { id: true },
});
```

#### Relational Queries

```typescript
import { db } from "@koko/db";
import { user } from "@koko/db/schema";
import { eq } from "drizzle-orm";

// Query with relations
const userWithPosts = await db.query.user.findFirst({
	where: eq(user.id, userId),
	with: {
		posts: true,
		profile: true,
	},
});

// Query with nested relations
const userWithData = await db.query.user.findFirst({
	where: eq(user.id, userId),
	with: {
		posts: {
			with: {
				comments: true,
			},
		},
	},
});

// Query with specific columns and relations
const userPartial = await db.query.user.findFirst({
	where: eq(user.id, userId),
	columns: {
		name: true,
		email: true,
	},
	with: {
		posts: {
			columns: {
				title: true,
				createdAt: true,
			},
		},
	},
});
```

#### Update

```typescript
import { db } from "@koko/db";
import { user, post } from "@koko/db/schema";
import { eq } from "drizzle-orm";

// Update with returning
const [updatedUser] = await db
	.update(user)
	.set({ name: "New Name", emailVerified: true })
	.where(eq(user.id, userId))
	.returning();

// Update multiple rows
await db
	.update(post)
	.set({ published: false })
	.where(eq(post.authorId, userId));

// Partial update
await db
	.update(user)
	.set({ emailVerified: true })
	.where(eq(user.id, userId));

// Update with SQL
await db
	.update(post)
	.set({ views: sql`${post.views} + 1` })
	.where(eq(post.id, postId));
```

#### Delete

```typescript
import { db } from "@koko/db";
import { user, post } from "@koko/db/schema";
import { eq } from "drizzle-orm";

// Delete with returning
const [deleted] = await db
	.delete(user)
	.where(eq(user.id, userId))
	.returning();

// Delete multiple rows
await db
	.delete(post)
	.where(eq(post.authorId, userId));

// Delete all (use with caution)
await db.delete(post);
```

### Filtering & Querying

```typescript
import { db } from "@koko/db";
import { post } from "@koko/db/schema";
import { eq, ne, gt, gte, lt, lte, like, inArray, and, or, not, isNull, isNotNull } from "drizzle-orm";

// Comparison operators
const posts1 = await db.select().from(post).where(eq(post.id, 1));
const posts2 = await db.select().from(post).where(ne(post.status, "archived"));
const posts3 = await db.select().from(post).where(gt(post.views, 100));
const posts4 = await db.select().from(post).where(gte(post.views, 100));
const posts5 = await db.select().from(post).where(lt(post.views, 1000));
const posts6 = await db.select().from(post).where(lte(post.views, 1000));

// LIKE operator
const searchResults = await db
	.select()
	.from(post)
	.where(like(post.title, "%typescript%"));

// IN operator
const postsByIds = await db
	.select()
	.from(post)
	.where(inArray(post.id, [1, 2, 3, 4, 5]));

// AND conditions
const filteredPosts = await db
	.select()
	.from(post)
	.where(
		and(
			eq(post.published, true),
			eq(post.authorId, userId)
		)
	);

// OR conditions
const posts = await db
	.select()
	.from(post)
	.where(
		or(
			like(post.title, "%typescript%"),
			like(post.content, "%typescript%")
		)
	);

// NOT conditions
const unpublished = await db
	.select()
	.from(post)
	.where(not(eq(post.published, true)));

// NULL checks
const withoutImage = await db
	.select()
	.from(user)
	.where(isNull(user.image));

const withImage = await db
	.select()
	.from(user)
	.where(isNotNull(user.image));

// Complex nested conditions
const complexQuery = await db
	.select()
	.from(post)
	.where(
		and(
			eq(post.published, true),
			or(
				eq(post.featured, true),
				gte(post.views, 1000)
			)
		)
	);
```

### Pagination

**Offset-based pagination:**

```typescript
import { db } from "@koko/db";
import { post } from "@koko/db/schema";
import { count } from "drizzle-orm";

const page = 1;
const pageSize = 20;
const offset = (page - 1) * pageSize;

const [items, [{ value: total }]] = await Promise.all([
	db.select().from(post).limit(pageSize).offset(offset),
	db.select({ value: count() }).from(post),
]);

const result = {
	items,
	total,
	page,
	pageSize,
	totalPages: Math.ceil(total / pageSize),
};
```

**Cursor-based pagination:**

```typescript
import { db } from "@koko/db";
import { post } from "@koko/db/schema";
import { gt, desc } from "drizzle-orm";

const limit = 20;
const cursor = "last-post-id"; // optional

const items = await db
	.select()
	.from(post)
	.where(cursor ? gt(post.id, cursor) : undefined)
	.orderBy(desc(post.createdAt))
	.limit(limit + 1);

let nextCursor: string | undefined = undefined;
if (items.length > limit) {
	const nextItem = items.pop();
	nextCursor = nextItem?.id;
}

const result = {
	items,
	nextCursor,
};
```

### Transactions

```typescript
import { db } from "@koko/db";
import { user, post } from "@koko/db/schema";

await db.transaction(async (tx) => {
	// Create user
	const [newUser] = await tx
		.insert(user)
		.values({
			id: crypto.randomUUID(),
			name: "John",
			email: "john@example.com",
		})
		.returning();

	// Create post for user
	await tx
		.insert(post)
		.values({
			title: "First Post",
			authorId: newUser.id,
		});

	// If any operation fails, entire transaction is rolled back
});
```

## Migrations

### Drizzle Kit Configuration

**`drizzle.config.ts`:**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	schema: "./src/schema/*",
	out: "./drizzle",
	dbCredentials: {
		url: process.env.DATABASE_URL || "",
	},
});
```

### Migration Commands

```bash
# Generate migration files
bun run db:generate

# Push schema changes directly to database (dev only)
bun run db:push

# Apply migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio

# Start local SQLite database
cd packages/db && bun run db:local
```

### Schema Changes

**Adding a new field:**

```typescript
// Just add to schema
export const user = sqliteTable("user", {
	// ...existing fields
	bio: text("bio"), // New optional field
});
```

Then run:
```bash
bun run db:generate  # Generate migration
bun run db:push      # Apply to database
```

**Removing a field:**

```typescript
// Remove from schema
export const user = sqliteTable("user", {
	// ...removed old field
});
```

Then run:
```bash
bun run db:generate
bun run db:push
```

**Renaming a field:**

This requires manual migration:

```sql
-- In migration file
ALTER TABLE user RENAME COLUMN old_name TO new_name;
```

## Performance Best Practices

### 1. Use prepared statements

```typescript
import { db } from "@koko/db";
import { user } from "@koko/db/schema";
import { eq } from "drizzle-orm";

const prepared = db
	.select()
	.from(user)
	.where(eq(user.id, sql.placeholder("id")))
	.prepare();

// Reuse prepared statement
const user1 = await prepared.execute({ id: "user-1" });
const user2 = await prepared.execute({ id: "user-2" });
```

### 2. Select only needed columns

```typescript
// Good - Only fetch needed columns
const users = await db
	.select({
		name: user.name,
		email: user.email,
	})
	.from(user);

// Bad - Fetches all columns
const users = await db.select().from(user);
```

### 3. Add indexes for filtered/sorted fields

```typescript
// Add indexes in schema
export const post = sqliteTable(
	"post",
	{
		authorId: text("author_id").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [
		index("post_author_idx").on(table.authorId),
		index("post_created_idx").on(table.createdAt),
		index("post_author_created_idx").on(table.authorId, table.createdAt),
	]
);
```

### 4. Use transactions for multi-step operations

```typescript
await db.transaction(async (tx) => {
	// Multiple related operations
	// All succeed or all fail
});
```

### 5. Batch operations

```typescript
// Good - Single query
const posts = await db
	.select()
	.from(post)
	.where(inArray(post.id, postIds));

// Bad - Multiple queries
const posts = await Promise.all(
	postIds.map((id) => db.select().from(post).where(eq(post.id, id)))
);
```

## Error Handling

```typescript
import { db } from "@koko/db";
import { user } from "@koko/db/schema";
import { TRPCError } from "@trpc/server";

try {
	const [newUser] = await db
		.insert(user)
		.values({
			id: crypto.randomUUID(),
			email: "user@example.com",
			name: "John",
		})
		.returning();
} catch (error) {
	// SQLite constraint violation (unique, foreign key, etc.)
	if (error.code === "SQLITE_CONSTRAINT") {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Email already exists",
		});
	}

	// Unknown error
	throw new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "Database operation failed",
		cause: error,
	});
}
```

## Type Safety

### TypeScript Integration

Drizzle provides full type safety out of the box:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull(),
	age: integer("age"),
});

// Infer types from schema
export type User = typeof user.$inferSelect;
export type InsertUser = typeof user.$inferInsert;

// Usage - Full type safety
const newUser: InsertUser = {
	id: crypto.randomUUID(),
	name: "John",
	email: "john@example.com",
	// age is optional
};

const [created]: User[] = await db.insert(user).values(newUser).returning();
```

## Best Practices

1. **Always use schemas** - Define schemas for all tables
2. **Add indexes** - Index fields used in queries
3. **Use TypeScript** - Leverage type inference
4. **Validate data** - Use Zod for input validation
5. **Handle errors** - Catch and handle database errors
6. **Use transactions** - For multi-step operations
7. **Select only needed columns** - Better performance
8. **Use prepared statements** - For repeated queries
9. **Add foreign key constraints** - Maintain data integrity
10. **Monitor queries** - Log slow queries in development

---
