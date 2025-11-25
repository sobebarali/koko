# Code Standards

## TypeScript

### Strict Mode
- `strict: true` - No implicit any
- `noUncheckedIndexedAccess: true` - Array access returns `T | undefined`
- `noUnusedLocals/Parameters: true` - No dead code
- `exactOptionalPropertyTypes: true` - Stricter optionals

### Type Rules
- **Never use `any`** - Use `unknown` instead
- **Explicit return types** for all functions
- **Object destructured params** - All functions use `{ param }: { param: Type }` syntax
- **Inline types** for function params (not separate interfaces)
- **Interfaces only** for React props extending React types
- **Use `as const`** for literal types

```typescript
// Good
function getUser({ id }: { id: string }): Promise<User> { ... }
function createPost({ title, authorId }: { title: string; authorId: string }): Promise<Post> { ... }
const routes = ["/", "/about"] as const;

// Bad
function getUser(id: string) { ... }              // No destructuring
function getUser(params: GetUserParams) { ... }  // Separate interface
function getUser({ id }) { ... }                  // No types
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `user-menu.tsx` |
| Components | PascalCase | `UserMenu` |
| Functions | camelCase | `getUserById` |
| Variables | camelCase | `isLoading` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Hooks | use prefix | `useAuth` |
| Event handlers | handle prefix | `handleClick` |
| Booleans | is/has/should prefix | `isLoading`, `hasError` |

## Biome Formatting

- **Indentation:** Tabs
- **Line width:** 100
- **Quotes:** Double
- **Semicolons:** Always
- **Trailing commas:** All

```bash
bun run check       # Format + lint
bun run check-types # TypeScript check
```

## Pre-commit Hooks

Husky + lint-staged runs on commit:
```json
{ "lint-staged": { "*.{ts,tsx,js,jsx,json}": ["biome check --write"] } }
```

Bypass (emergency): `git commit --no-verify -m "message"`

---

## Security

### Authentication (Better-Auth)
- Session cookie: HttpOnly, Secure (prod), SameSite: lax
- Password: min 8, max 72 chars (bcrypt limit)
- **Never** log passwords or expose hashes

### Permission Checks
Always verify ownership before mutations:
```typescript
deletePost: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, input.id) });
    if (!post) throw new TRPCError({ code: "NOT_FOUND" });
    if (post.authorId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return db.delete(posts).where(eq(posts.id, input.id));
  }),
```

### Input Validation
```typescript
// Always validate with Zod
.input(z.object({
  email: z.string().email().toLowerCase().trim(),
  title: z.string().min(1).max(200).trim(),
}))
```

### CORS
```typescript
cors({
  origin: process.env.CORS_ORIGIN?.split(",") || [],  // Never "*" in prod
  credentials: true,
})
```

### Sensitive Data
- **Never expose:** password hashes, session tokens, API keys
- **Select only needed fields** in queries
- **Generic error messages** (don't leak user existence)

### Environment Variables
- `.env` - secrets (gitignored)
- `.env.example` - template (committed)
- Validate on startup: `if (!process.env.DATABASE_URL) throw new Error(...)`

---

## Testing (Vitest)

**Backend only** - no UI tests

```typescript
import { describe, test, expect } from "vitest";

describe("User router", () => {
  test("getProfile returns user", async () => {
    const ctx = await createContext({ session: { user: { id: "1" } } });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.user.getProfile();
    expect(result.id).toBe("1");
  });

  test("requires auth", async () => {
    const ctx = await createContext({ session: null });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.user.getProfile()).rejects.toThrow("UNAUTHORIZED");
  });
});
```

```bash
vitest          # Watch mode
vitest run      # Run once
vitest --coverage
```

---

## Checklist

### Before Commit
- [ ] `bun run check` passes
- [ ] `bun run check-types` passes
- [ ] No `console.log` in production code
- [ ] No `any` types

### Before PR
- [ ] Input validation on all endpoints
- [ ] Permission checks on mutations
- [ ] Error handling implemented
- [ ] Backend tests for critical paths

### Before Deploy
- [ ] HTTPS enabled
- [ ] CORS with specific origins
- [ ] Environment variables set
- [ ] Security headers configured
