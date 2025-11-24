# Security Guidelines

## Authentication & Authorization

### Better-Auth Implementation

The project uses **Better-Auth v1.3.28** for authentication with MongoDB storage.

**Setup Location:** `packages/auth/src/auth.ts`

**Key Configuration:**
```typescript
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

export const auth = betterAuth({
	database: mongodbAdapter(process.env.DATABASE_URL),
	emailAndPassword: {
		enabled: true,
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5, // 5 minutes
		},
	},
});
```

### Session Management

**Session Storage:** MongoDB (persisted sessions)

**Session Cookie:**
- Name: `better-auth.session_token`
- HttpOnly: `true` (prevents XSS access)
- Secure: `true` in production (HTTPS only)
- SameSite: `lax` or `strict`

**Session Lifetime:**
- Default: 7 days
- Cookie cache: 5 minutes

**Best Practices:**
1. **Never expose session tokens** in logs or error messages
2. **Regenerate session on privilege escalation** (e.g., email verification)
3. **Implement session invalidation** on logout
4. **Use HTTPS** in production (enforces Secure cookie flag)

### Password Security

**Requirements:**
- Minimum 8 characters
- Maximum 72 characters (bcrypt limit)
- No complexity requirements enforced (but recommended)

**Hashing:** Better-Auth uses bcrypt by default

**Never:**
- Store passwords in plain text
- Log passwords (even in development)
- Send passwords in URLs or GET requests
- Include passwords in error messages
- Expose password hashes to the client

```typescript
// Good - Proper password handling
export const registerRouter = router({
	register: publicProcedure
		.input(
			z.object({
				email: z.string().email(),
				password: z.string().min(8).max(72),
				name: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Better-Auth handles password hashing
			const user = await auth.api.signUpEmail({
				body: input,
			});
			return user;
		}),
});

// Bad - Never do this
.mutation(async ({ ctx, input }) => {
	console.log("Password:", input.password); // NEVER log passwords
	await ctx.db.user.create({
		data: {
			password: input.password, // NEVER store plaintext
		},
	});
});
```

### Protected Routes

Use **protectedProcedure** for authenticated endpoints:

```typescript
// packages/api/src/init.ts
export const protectedProcedure = t.procedure.use(async (opts) => {
	const { ctx } = opts;

	if (!ctx.session?.user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in",
		});
	}

	return opts.next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});
```

**Usage:**
```typescript
export const userRouter = router({
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		// ctx.session.user is guaranteed to exist
		return ctx.db.user.findUnique({
			where: { id: ctx.session.user.id },
		});
	}),
});
```

### Permission Checks

Always verify resource ownership before mutations:

```typescript
// Good - Check ownership
deletePost: protectedProcedure
	.input(z.object({ postId: z.string() }))
	.mutation(async ({ ctx, input }) => {
		const post = await ctx.db.post.findUnique({
			where: { id: input.postId },
		});

		if (!post) {
			throw new TRPCError({ code: "NOT_FOUND" });
		}

		if (post.authorId !== ctx.session.user.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only delete your own posts",
			});
		}

		return ctx.db.post.delete({ where: { id: input.postId } });
	}),

// Bad - Missing permission check
deletePost: protectedProcedure
	.input(z.object({ postId: z.string() }))
	.mutation(async ({ ctx, input }) => {
		return ctx.db.post.delete({ where: { id: input.postId } });
	}),
```

## Input Validation

### Zod Schema Validation

**Always validate all inputs** using Zod:

```typescript
// Good - Strict validation
createPost: protectedProcedure
	.input(
		z.object({
			title: z.string().min(1).max(200).trim(),
			content: z.string().min(1).max(10000),
			tags: z.array(z.string().max(50)).max(10),
			visibility: z.enum(["public", "private", "unlisted"]),
		}),
	)
	.mutation(async ({ ctx, input }) => {
		// Input is guaranteed to be valid
		return ctx.db.post.create({ data: input });
	}),

// Bad - No validation
createPost: protectedProcedure
	.input(z.any())
	.mutation(async ({ ctx, input }) => {
		// Dangerous! Unvalidated input
		return ctx.db.post.create({ data: input });
	}),
```

### Sanitization

**String Inputs:**
- Use `.trim()` to remove whitespace
- Use `.toLowerCase()` for case-insensitive fields
- Validate length limits

**Email Addresses:**
```typescript
email: z.string().email().toLowerCase().trim()
```

**URLs:**
```typescript
url: z.string().url().refine(
	(url) => {
		const parsed = new URL(url);
		return ["http:", "https:"].includes(parsed.protocol);
	},
	{ message: "Only HTTP(S) URLs are allowed" }
)
```

**File Uploads:**
```typescript
fileUpload: z.object({
	filename: z.string().regex(/^[a-zA-Z0-9-_\.]+$/),
	size: z.number().max(10 * 1024 * 1024), // 10MB max
	mimeType: z.enum(["image/jpeg", "image/png", "video/mp4"]),
})
```

### SQL/NoSQL Injection Prevention

**Prisma protects against injection** by parameterizing queries automatically.

**Good:**
```typescript
// Safe - Prisma parameterizes
const user = await ctx.db.user.findUnique({
	where: { email: input.email },
});
```

**Never:**
```typescript
// DANGER - Raw query with interpolation
const user = await ctx.db.$queryRaw`
	SELECT * FROM users WHERE email = '${input.email}'
`;
```

**If raw queries are necessary:**
```typescript
// Safe - Use parameterized queries
const user = await ctx.db.$queryRaw`
	SELECT * FROM users WHERE email = ${input.email}
`;
```

## CORS Configuration

**Location:** `apps/server/src/index.ts`

**Current Setup:**
```typescript
app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
		credentials: true,
	}),
);
```

**Security Rules:**

1. **Never use `*` wildcard in production:**
```typescript
// Bad
origin: "*"

// Good
origin: ["https://artellio.com", "https://app.artellio.com"]
```

2. **Always specify exact origins:**
```typescript
origin: process.env.CORS_ORIGIN?.split(",") || []
```

3. **Enable credentials for cookies:**
```typescript
credentials: true
```

4. **Limit allowed methods:**
```typescript
allowMethods: ["GET", "POST", "PUT", "DELETE"]
```

## Environment Variables

### Sensitive Data

**Never commit:**
- Database credentials
- API keys
- Secret tokens
- Encryption keys
- OAuth secrets

**Use `.env` files:** (excluded via `.gitignore`)

```env
# .env
DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/db"
JWT_SECRET="your-secret-key"
POLAR_API_KEY="pk_test_..."
```

**Provide `.env.example`:** (committed to repo)

```env
# .env.example
DATABASE_URL="mongodb://localhost:27017/artellio"
JWT_SECRET="change-me-in-production"
POLAR_API_KEY=""
```

### Environment Variable Validation

Validate required environment variables on startup:

```typescript
// packages/db/src/index.ts
if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is required");
}
```

## Data Exposure

### Sensitive Fields

**Never expose:**
- Password hashes
- Session tokens
- Internal IDs (when not needed)
- Email addresses (unless user's own or public)
- Payment information
- API keys

**Use Prisma `select` or `omit`:**

```typescript
// Good - Exclude sensitive fields
const user = await ctx.db.user.findUnique({
	where: { id: input.userId },
	select: {
		id: true,
		name: true,
		email: true,
		// password is excluded
		// createdAt, updatedAt excluded
	},
});

// Better - Create a reusable select
const publicUserSelect = {
	id: true,
	name: true,
	image: true,
} as const;

const user = await ctx.db.user.findUnique({
	where: { id: input.userId },
	select: publicUserSelect,
});
```

### Error Messages

**Never leak sensitive information in errors:**

```typescript
// Bad - Leaks existence of user
if (!user) {
	throw new TRPCError({
		code: "NOT_FOUND",
		message: `User with email ${input.email} not found`,
	});
}

// Good - Generic message
if (!user || !user.verifyPassword(input.password)) {
	throw new TRPCError({
		code: "UNAUTHORIZED",
		message: "Invalid email or password",
	});
}
```

## MongoDB Security

### Connection String

**Use connection pooling:**
```
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority"
```

**Enable SSL/TLS in production:**
```
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/db?ssl=true"
```

### Indexes

Create indexes for security-relevant queries:

```prisma
model User {
	id    String @id @default(auto()) @map("_id") @db.ObjectId
	email String @unique // Automatically indexed
}
```

### Data Validation

Use Prisma schema constraints:

```prisma
model Post {
	id      String @id @default(auto()) @map("_id") @db.ObjectId
	title   String @db.String // Type constraint
	content String

	author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)
	authorId String @db.ObjectId

	@@index([authorId]) // Performance + security
}
```

## XSS Prevention

### React's Built-in Protection

React escapes content by default:

```tsx
// Safe - React escapes
<div>{user.name}</div>
<input value={user.email} />
```

### Dangerous Patterns to Avoid

**Never use `dangerouslySetInnerHTML` with user content:**

```tsx
// DANGER - XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// Good - Sanitize first
import DOMPurify from "isomorphic-dompurify";

<div dangerouslySetInnerHTML={{
	__html: DOMPurify.sanitize(userComment)
}} />
```

### Link Safety

Validate user-provided URLs:

```tsx
// Bad - Open redirect vulnerability
<a href={user.website}>Visit</a>

// Good - Validate protocol
const isSafeUrl = (url: string) => {
	try {
		const parsed = new URL(url);
		return ["http:", "https:"].includes(parsed.protocol);
	} catch {
		return false;
	}
};

<a href={isSafeUrl(user.website) ? user.website : "#"}>Visit</a>
```

## Rate Limiting

**Implement rate limiting** for sensitive endpoints:

```typescript
// TODO: Add rate limiting middleware
// Example: 5 requests per minute for login

const rateLimitMiddleware = t.middleware(async (opts) => {
	const { ctx } = opts;
	const ip = ctx.headers.get("x-forwarded-for") || "unknown";

	const attempts = await getLoginAttempts(ip);

	if (attempts > 5) {
		throw new TRPCError({
			code: "TOO_MANY_REQUESTS",
			message: "Too many login attempts. Try again later.",
		});
	}

	return opts.next();
});
```

**Critical endpoints to rate limit:**
- Login / signup
- Password reset
- Email verification
- File uploads
- API key generation

## Audit Logging

Log security-relevant events:

```typescript
// Good - Log important actions
createPost: protectedProcedure
	.input(createPostSchema)
	.mutation(async ({ ctx, input }) => {
		const post = await ctx.db.post.create({ data: input });

		// Log action
		await ctx.db.auditLog.create({
			data: {
				userId: ctx.session.user.id,
				action: "POST_CREATED",
				resourceId: post.id,
				timestamp: new Date(),
			},
		});

		return post;
	}),
```

**Log these events:**
- User authentication (login, logout, failures)
- Permission changes
- Data access (sensitive resources)
- Configuration changes
- Payment transactions

## Security Headers

Set security headers in Hono:

```typescript
import { secureHeaders } from "hono/secure-headers";

app.use("*", secureHeaders());

// Or custom headers
app.use("*", async (c, next) => {
	c.header("X-Frame-Options", "DENY");
	c.header("X-Content-Type-Options", "nosniff");
	c.header("Referrer-Policy", "strict-origin-when-cross-origin");
	c.header(
		"Content-Security-Policy",
		"default-src 'self'; script-src 'self' 'unsafe-inline'"
	);
	await next();
});
```

## Dependency Security

1. **Keep dependencies updated:** Use `bun update`
2. **Audit dependencies:** Use `bun audit` (when available)
3. **Review package.json:** Before adding new dependencies
4. **Pin versions:** Use exact versions for security-critical packages
5. **Use lockfile:** Commit `bun.lockb` to repo

## Security Checklist

Before deploying:

- [ ] All environment variables configured
- [ ] HTTPS enabled
- [ ] CORS configured with specific origins
- [ ] Session cookies have Secure flag
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] Input validation on all endpoints
- [ ] Permission checks on all mutations
- [ ] Sensitive data excluded from responses
- [ ] Error messages don't leak information
- [ ] Dependencies audited
- [ ] Database connection string uses SSL
- [ ] Audit logging enabled
