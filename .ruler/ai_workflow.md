# AI Workflow Guidelines

## Purpose

This document provides guidelines for AI assistants working on the Artellio codebase. It outlines best practices, common patterns, and workflows to ensure consistent, high-quality code generation and modifications.

## Understanding the Codebase

### Before Starting Any Task

1. **Read the project instructions** all `.ruler/*.md` files
2. **Understand the architecture** - Monorepo structure, package dependencies
3. **Identify affected packages** - Determine which apps/packages need changes
4. **Check existing patterns** - Look for similar implementations in the codebase
5. **Plan the approach** - Break down complex tasks into steps

### Key Documentation Files

- **`project_architecture.md`** - Overall structure, package dependencies
- **`api_conventions.md`** - tRPC patterns, router creation
- **`database_guidelines.md`** - Prisma schema, queries, migrations
- **`frontend_patterns.md`** - React, routing, state management
- **`coding_style.md`** - TypeScript standards, naming conventions
- **`security_guidelines.md`** - Auth, validation, data protection
- **`testing_quality.md`** - Testing patterns, code quality
- **`monorepo_workflow.md`** - Turborepo, workspace management

## Task Approach Methodology

### 1. Task Analysis

**Ask clarifying questions if:**
- Requirements are ambiguous
- Multiple implementation approaches exist
- Security implications are unclear
- Breaking changes may be introduced
- User preferences are unknown

**Analyze task scope:**
- Is this a new feature, bug fix, or refactor?
- Which layers are affected? (UI, API, Database, Auth)
- What packages need modification?
- Are there dependencies between changes?

### 2. Planning Phase

**Use TodoWrite for:**
- Complex multi-step tasks (3+ steps)
- Features requiring multiple file changes
- Tasks with database migrations
- Anything requiring careful tracking

**Plan structure:**
```typescript
// Example todo structure for a new feature
[
	{ content: "Add Prisma schema models", status: "pending", activeForm: "Adding Prisma schema models" },
	{ content: "Generate Prisma client", status: "pending", activeForm: "Generating Prisma client" },
	{ content: "Create tRPC router procedures", status: "pending", activeForm: "Creating tRPC router procedures" },
	{ content: "Implement UI components", status: "pending", activeForm: "Implementing UI components" },
	{ content: "Add routes and navigation", status: "pending", activeForm: "Adding routes and navigation" },
	{ content: "Test functionality", status: "pending", activeForm: "Testing functionality" }
]
```

### 3. Implementation Order

**Standard workflow for new features:**

1. **Database Layer** (`packages/db`)
   - Define Prisma schema models
   - Add relations and indexes
   - Run `db:push` or create migration
   - Generate Prisma client

2. **API Layer** (`packages/api`)
   - Create tRPC router
   - Define input schemas with Zod
   - Implement procedures (queries/mutations)
   - Add to root router

3. **Frontend Layer** (`apps/web`)
   - Create UI components
   - Implement routes
   - Add API queries/mutations
   - Wire up navigation

4. **Validation & Testing**
   - Type check all packages
   - Run linting and formatting
   - Manual testing of functionality
   - Write backend tests if critical

### 4. Code Generation Standards

**Always:**
- Use existing patterns from the codebase
- Follow TypeScript strict mode rules
- Include explicit return types
- Use inline types for function parameters
- Validate inputs with Zod
- Handle errors properly
- Add indexes for database queries
- Check permissions in mutations

**Never:**
- Use `any` type
- Skip input validation
- Expose sensitive data
- Create security vulnerabilities
- Use console.log in production code
- Mix different patterns
- Create unnecessary abstractions

## Common Workflows

### Workflow 1: Adding a New API Endpoint

**Steps:**

1. **Define the data model** (if needed)
```prisma
// packages/db/prisma/schema/feature.prisma
model Feature {
	id        String   @id @default(auto()) @map("_id") @db.ObjectId
	name      String
	userId    String   @db.ObjectId
	createdAt DateTime @default(now())
	updatedAt DateTime @updatedAt

	user User @relation(fields: [userId], references: [id], onDelete: Cascade)

	@@index([userId])
}
```

2. **Create tRPC router**
```typescript
// packages/api/src/routers/feature.ts
import { z } from "zod";
import { protectedProcedure, router } from "../init";
import { TRPCError } from "@trpc/server";

export const featureRouter = router({
	list: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			return ctx.db.feature.findMany({
				where: { userId: ctx.session.user.id },
				take: input.limit,
				orderBy: { createdAt: "desc" },
			});
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(200),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.feature.create({
				data: {
					...input,
					userId: ctx.session.user.id,
				},
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const feature = await ctx.db.feature.findUnique({
				where: { id: input.id },
			});

			if (!feature) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			if (feature.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			return ctx.db.feature.delete({
				where: { id: input.id },
			});
		}),
});
```

3. **Add to root router**
```typescript
// packages/api/src/root.ts
import { featureRouter } from "./routers/feature";

export const appRouter = router({
	// ... existing routers
	feature: featureRouter,
});
```

4. **Implement UI**
```typescript
// apps/web/src/components/feature-list.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

export function FeatureList() {
	const queryClient = useQueryClient();

	const { data: features, isLoading } = useQuery({
		queryKey: ["features"],
		queryFn: () => trpc.feature.list.query({ limit: 20 }),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => trpc.feature.delete.mutate({ id }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["features"] });
		},
	});

	if (isLoading) return <div>Loading...</div>;

	return (
		<div className="space-y-4">
			{features?.map((feature) => (
				<div key={feature.id} className="flex items-center justify-between">
					<span>{feature.name}</span>
					<button onClick={() => deleteMutation.mutate(feature.id)}>
						Delete
					</button>
				</div>
			))}
		</div>
	);
}
```

### Workflow 2: Adding a Database Model

**Steps:**

1. **Create schema file**
```bash
# Create new schema file
touch packages/db/prisma/schema/model-name.prisma
```

2. **Define model**
```prisma
model ModelName {
	id        String   @id @default(auto()) @map("_id") @db.ObjectId
	field1    String
	field2    Int
	createdAt DateTime @default(now())
	updatedAt DateTime @updatedAt

	// Relations
	user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
	userId String @db.ObjectId

	@@index([userId])
}

// Add relation to User model (if needed)
model User {
	// ... existing fields
	modelNames ModelName[]
}
```

3. **Push schema changes**
```bash
cd packages/db
bun run db:push
bun run db:generate
```

4. **Verify types**
```bash
bun run check-types
```

### Workflow 3: Adding a New Route

**Steps:**

1. **Create route file**
```typescript
// apps/web/src/routes/feature/$id.tsx
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
	tab: z.enum(["overview", "settings"]).optional(),
});

export const Route = createFileRoute("/feature/$id")({
	validateSearch: searchSchema,
	loader: async ({ params, context }) => {
		const feature = await context.queryClient.ensureQueryData({
			queryKey: ["feature", params.id],
			queryFn: () => trpc.feature.getById.query({ id: params.id }),
		});
		return { feature };
	},
	component: FeatureDetail,
});

function FeatureDetail() {
	const { id } = Route.useParams();
	const { feature } = Route.useLoaderData();

	return (
		<div>
			<h1>{feature.name}</h1>
		</div>
	);
}
```

2. **Add navigation**
```typescript
// Add to navigation component
<Link
	to="/feature/$id"
	params={{ id: feature.id }}
>
	{feature.name}
</Link>
```

### Workflow 4: Modifying Existing Code

**Steps:**

1. **Read the existing code** - Always use Read tool first
2. **Understand the pattern** - Match existing style and structure
3. **Identify impact** - What else might be affected?
4. **Make minimal changes** - Only modify what's necessary
5. **Preserve functionality** - Don't break existing features
6. **Update related code** - Keep everything in sync

**Example - Adding a field to existing model:**

```typescript
// 1. Read existing schema
// 2. Add new field
model Post {
	// ... existing fields
	featured  Boolean @default(false) // New field
}

// 3. Update Prisma client
// packages/db: bun run db:push && bun run db:generate

// 4. Update API procedures (if needed)
// 5. Update UI components (if needed)
```

## Code Quality Checklist

### Before Marking a Task Complete

- [ ] **Type Safety**
  - All functions have explicit return types
  - No `any` types used
  - Inline types used for function parameters
  - `tsc --noEmit` passes

- [ ] **Code Style**
  - Follows existing patterns in codebase
  - Proper naming conventions
  - No unused imports or variables
  - `bun run check` passes

- [ ] **Functionality**
  - Code works as intended
  - Edge cases handled
  - Error handling implemented
  - Loading states managed

- [ ] **Security**
  - Input validation with Zod
  - Permission checks in place
  - No sensitive data exposed
  - No security vulnerabilities

- [ ] **Database**
  - Proper indexes added
  - Relations defined correctly
  - Cascade deletes configured
  - Migrations generated (if needed)

- [ ] **API**
  - Correct procedure type (query/mutation)
  - Error codes appropriate
  - Context used correctly
  - Added to root router

- [ ] **UI**
  - Components properly typed
  - Loading/error states handled
  - Accessibility considered
  - Responsive design

## Common Patterns to Follow

### Pattern 1: Protected Mutation with Permission Check

```typescript
deleteResource: protectedProcedure
	.input(z.object({ id: z.string() }))
	.mutation(async ({ ctx, input }) => {
		// 1. Fetch resource
		const resource = await ctx.db.resource.findUnique({
			where: { id: input.id },
		});

		// 2. Check existence
		if (!resource) {
			throw new TRPCError({ code: "NOT_FOUND" });
		}

		// 3. Check permission
		if (resource.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "FORBIDDEN" });
		}

		// 4. Perform action
		return ctx.db.resource.delete({
			where: { id: input.id },
		});
	}),
```

### Pattern 2: Query with Pagination

```typescript
list: publicProcedure
	.input(
		z.object({
			limit: z.number().min(1).max(100).default(20),
			cursor: z.string().optional(),
		}),
	)
	.query(async ({ ctx, input }) => {
		const items = await ctx.db.resource.findMany({
			take: input.limit + 1,
			cursor: input.cursor ? { id: input.cursor } : undefined,
			orderBy: { createdAt: "desc" },
		});

		let nextCursor: string | undefined = undefined;
		if (items.length > input.limit) {
			const nextItem = items.pop();
			nextCursor = nextItem?.id;
		}

		return { items, nextCursor };
	}),
```

### Pattern 3: Component with Query and Mutation

```typescript
export function ResourceList() {
	const queryClient = useQueryClient();

	// Query
	const { data, isLoading, error } = useQuery({
		queryKey: ["resources"],
		queryFn: () => trpc.resource.list.query(),
	});

	// Mutation
	const createMutation = useMutation({
		mutationFn: (input: { name: string }) =>
			trpc.resource.create.mutate(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["resources"] });
		},
	});

	// Early returns
	if (error) return <ErrorState error={error} />;
	if (isLoading) return <LoadingState />;

	// Render
	return <div>{/* UI */}</div>;
}
```

### Pattern 4: Form with Validation

```typescript
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";

const schema = z.object({
	name: z.string().min(1).max(100),
	email: z.string().email(),
});

export function ResourceForm() {
	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
		},
		onSubmit: async ({ value }) => {
			await trpc.resource.create.mutate(value);
		},
		validatorAdapter: zodValidator(),
	});

	return (
		<form onSubmit={(e) => {
			e.preventDefault();
			form.handleSubmit();
		}}>
			<form.Field
				name="name"
				validators={{
					onChange: schema.shape.name,
				}}
			>
				{(field) => (
					<div>
						<Input
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
						{field.state.meta.errors && (
							<span className="text-sm text-red-500">
								{field.state.meta.errors[0]}
							</span>
						)}
					</div>
				)}
			</form.Field>
			<Button type="submit">Submit</Button>
		</form>
	);
}
```

## Error Handling Patterns

### API Errors

```typescript
// Always use TRPCError with appropriate codes
throw new TRPCError({
	code: "NOT_FOUND", // or UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, etc.
	message: "User-friendly error message",
});

// Wrap unknown errors
try {
	await someOperation();
} catch (error) {
	if (error instanceof TRPCError) {
		throw error;
	}
	throw new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "Operation failed",
		cause: error,
	});
}
```

### UI Errors

```typescript
// Show user-friendly errors
if (error) {
	toast.error("Failed to load data. Please try again.");
	return <ErrorState />;
}

// Don't expose technical details
// Bad: "MongoDB connection failed at 127.0.0.1:27017"
// Good: "Unable to load data. Please try again."
```

## Communication Guidelines

### When to Ask Questions

**Always ask if:**
- Requirements are unclear or ambiguous
- Multiple valid approaches exist
- Security implications need clarification
- User preferences are needed
- Breaking changes might be introduced

**Don't ask if:**
- The answer is in the documentation
- The pattern is clear from existing code
- It's a standard implementation
- The requirement is explicit

### Progress Updates

**Use TodoWrite to:**
- Show progress on multi-step tasks
- Keep user informed
- Track completed work
- Identify blockers

**Update todos:**
- Mark tasks as `in_progress` when starting
- Mark as `completed` immediately when done
- Add new tasks if discovered during work
- Remove tasks that become irrelevant

### Code References

**Always use markdown links:**
```markdown
I've added the new router in [packages/api/src/routers/feature.ts](packages/api/src/routers/feature.ts)

The mutation is defined at [feature.ts:42-58](packages/api/src/routers/feature.ts#L42-L58)
```

## Testing Approach

### Backend Testing (Required)

**Test critical paths:**
- Authentication flows
- Authorization checks
- Data mutations
- Business logic
- Payment processing

**Example test:**
```typescript
import { describe, test, expect } from "vitest";
import { appRouter } from "../root";
import { createContext } from "../context";

describe("Feature router", () => {
	test("creates feature with valid input", async () => {
		const ctx = await createContext({
			session: { user: { id: "user-id" } },
		});
		const caller = appRouter.createCaller(ctx);

		const result = await caller.feature.create({
			name: "Test Feature",
		});

		expect(result.name).toBe("Test Feature");
	});

	test("requires authentication", async () => {
		const ctx = await createContext({ session: null });
		const caller = appRouter.createCaller(ctx);

		await expect(
			caller.feature.create({ name: "Test" })
		).rejects.toThrow("UNAUTHORIZED");
	});
});
```

### Frontend Testing (Not Required)

**Focus on backend only:**
- No component tests
- No UI interaction tests
- No visual regression tests

**Why?**
- Backend testing provides core safety
- UI tests are brittle and slow
- Manual testing for UI is sufficient

## Performance Considerations

### Database Queries

**Always:**
- Add indexes for filtered/sorted fields
- Use `select` to fetch only needed fields
- Implement pagination for lists
- Use cursor-based pagination for large datasets

**Example:**
```typescript
// Good - Optimized query
const posts = await ctx.db.post.findMany({
	where: { userId },
	select: {
		id: true,
		title: true,
		createdAt: true,
	},
	take: 20,
	orderBy: { createdAt: "desc" },
});

// Bad - Fetches everything
const posts = await ctx.db.post.findMany({
	where: { userId },
});
```

### Frontend Performance

**Best practices:**
- Use TanStack Query caching
- Implement optimistic updates
- Lazy load heavy components
- Code split routes automatically
- Optimize images

## Security Best Practices

### Input Validation

**Always validate with Zod:**
```typescript
.input(
	z.object({
		email: z.string().email().toLowerCase().trim(),
		name: z.string().min(1).max(100).trim(),
		age: z.number().int().min(0).max(150),
	}),
)
```

### Permission Checks

**Always check ownership:**
```typescript
if (resource.userId !== ctx.session.user.id) {
	throw new TRPCError({ code: "FORBIDDEN" });
}
```

### Data Exposure

**Never expose:**
- Password hashes
- Session tokens
- API keys
- Internal system details

**Use select:**
```typescript
select: {
	id: true,
	name: true,
	email: true,
	// password excluded
}
```

## Deployment Considerations

### Environment Variables

**Always:**
- Document required env vars
- Provide `.env.example`
- Validate on startup
- Never commit secrets

### Build Process

**Ensure:**
- All packages build successfully
- Type checking passes
- Tests pass
- No build warnings

### Database Migrations

**For production:**
```bash
# Development
bun run db:push

# Production
bunx prisma migrate dev --name description
bunx prisma migrate deploy
```

## Troubleshooting Guide

### Common Issues

**Type errors after schema change:**
```bash
cd packages/db
bun run db:generate
cd ../..
bun run check-types
```

**Import errors:**
```bash
# Rebuild packages
turbo run build --force
```

**Stale cache:**
```bash
# Clear Turbo cache
rm -rf .turbo
turbo run build --force
```

## Best Practices Summary

1. **Always read existing code** before making changes
2. **Follow established patterns** in the codebase
3. **Use inline types** for function parameters
4. **Validate all inputs** with Zod schemas
5. **Handle errors gracefully** with appropriate codes
6. **Check permissions** before mutations
7. **Add database indexes** for queries
8. **Use TodoWrite** for complex tasks
9. **Test critical paths** (backend only)
10. **Keep changes minimal** and focused
11. **Document complex logic** with comments
12. **Run quality checks** before completion

## Final Checklist

Before completing any task:

- [ ] Code follows all style guidelines
- [ ] Type checking passes (`tsc --noEmit`)
- [ ] Linting passes (`bun run check`)
- [ ] Tests written for critical paths (backend only)
- [ ] Security considerations addressed
- [ ] Performance optimized
- [ ] Error handling implemented
- [ ] Documentation updated (if needed)
- [ ] TodoWrite tasks marked complete
- [ ] User informed of completion

---

**Remember:** Quality over speed. Take time to understand the codebase, follow established patterns, and ensure code is secure, performant, and maintainable.
