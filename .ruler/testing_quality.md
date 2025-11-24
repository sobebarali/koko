# Testing & Quality Assurance

## Code Quality Tools

### Biome

**Version:** v2.2.0

**Purpose:** All-in-one tool for linting, formatting, and import organization

**Configuration:** `biome.json` at repository root

```json
{
	"$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
	"vcs": {
		"enabled": true,
		"clientKind": "git",
		"useIgnoreFile": true
	},
	"organizeImports": {
		"enabled": true
	},
	"linter": {
		"enabled": true,
		"rules": {
			"recommended": true,
			"suspicious": {
				"noAssignInExpressions": "error"
			},
			"style": {
				"useAsConstAssertion": "error",
				"useInferableTypes": "error"
			},
			"correctness": {
				"useExhaustiveDependencies": "info"
			}
		}
	},
	"formatter": {
		"enabled": true,
		"indentStyle": "tab",
		"lineWidth": 100
	},
	"javascript": {
		"formatter": {
			"quoteStyle": "double",
			"semicolons": "always"
		}
	}
}
```

### Running Biome

**Format and lint:**
```bash
bun run check              # Format and lint all files
biome check --write .      # Same, but direct command
```

**Lint only:**
```bash
biome lint .
```

**Format only:**
```bash
biome format --write .
```

**Check without writing:**
```bash
biome check .
```

**Specific files:**
```bash
biome check --write src/components/ui/button.tsx
```

## TypeScript Type Checking

### Configuration

**Base config:** `tsconfig.base.json`

```json
{
	"compilerOptions": {
		"target": "ESNext",
		"module": "ESNext",
		"moduleResolution": "Bundler",
		"lib": ["ESNext", "DOM", "DOM.Iterable"],
		"jsx": "react-jsx",

		// Strict mode
		"strict": true,
		"noUncheckedIndexedAccess": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true,
		"exactOptionalPropertyTypes": true,

		// Module system
		"esModuleInterop": true,
		"allowSyntheticDefaultImports": true,
		"verbatimModuleSyntax": true,
		"resolveJsonModule": true,
		"isolatedModules": true,

		// Output
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true,

		// Other
		"skipLibCheck": true,
		"allowJs": false
	}
}
```

### Running Type Checks

**All packages:**
```bash
bun run check-types
```

**Specific workspace:**
```bash
cd apps/web
bun run check-types
```

**Watch mode (development):**
```bash
tsc --noEmit --watch
```

### Type Safety Rules

1. **Strict mode enabled** - No implicit any, strict null checks
2. **No unchecked indexed access** - Array/object access returns `T | undefined`
3. **No unused locals/parameters** - Clean code enforcement
4. **Exact optional property types** - Stricter optional properties
5. **Verbatim module syntax** - Explicit import/export

## Pre-commit Hooks

### Husky Setup

**Installation:**
```bash
bun add -D husky lint-staged
bunx husky init
```

**Configuration (`.husky/pre-commit`):**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

bunx lint-staged
```

### lint-staged Configuration

**`package.json`:**
```json
{
	"lint-staged": {
		"*.{ts,tsx,js,jsx,json}": [
			"biome check --write --no-errors-on-unmatched"
		]
	}
}
```

**What happens on commit:**
1. Git stages files (`git add`)
2. `git commit` triggered
3. Husky runs pre-commit hook
4. lint-staged runs Biome on staged files
5. Biome formats and lints
6. If errors, commit fails
7. If successful, commit completes

**Bypass hook (emergency):**
```bash
git commit --no-verify -m "Emergency fix"
```

## Testing Framework

### Vitest

**Test Framework:** Vitest (fast, Vite-native test runner)

**Installation:**
```bash
bun add -D vitest
```

**Test file naming:**
- `*.test.ts` - Backend/API tests
- `*.spec.ts` - Alternative convention
- **NO UI/component tests** - Focus on backend testing only

**Example backend test:**
```typescript
// packages/api/src/lib/utils.test.ts
import { describe, test, expect } from "vitest";
import { hashPassword, verifyPassword } from "./utils";

describe("Password utilities", () => {
	test("hashes password correctly", async () => {
		const password = "SecurePass123!";
		const hashed = await hashPassword(password);

		expect(hashed).not.toBe(password);
		expect(hashed.length).toBeGreaterThan(0);
	});

	test("verifies password correctly", async () => {
		const password = "SecurePass123!";
		const hashed = await hashPassword(password);

		const isValid = await verifyPassword(password, hashed);
		expect(isValid).toBe(true);

		const isInvalid = await verifyPassword("WrongPass", hashed);
		expect(isInvalid).toBe(false);
	});
});
```

**Running tests:**
```bash
vitest                      # Run all tests in watch mode
vitest run                  # Run once
vitest --coverage           # With coverage
vitest src/lib/utils.test.ts  # Run specific test
```

**Vitest configuration (`vitest.config.ts`):**
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
	},
});
```

### Testing tRPC Procedures (Backend Only)

```typescript
// packages/api/src/routers/user.test.ts
import { describe, test, expect, beforeEach } from "vitest";
import { appRouter } from "../root";
import { createContext } from "../context";
import { db } from "@artellio/db";

describe("User router", () => {
	beforeEach(async () => {
		// Clean up test data
		await db.user.deleteMany();
	});

	test("getProfile returns user data", async () => {
		const user = await db.user.create({
			data: {
				email: "test@example.com",
				name: "Test User",
			},
		});

		const ctx = await createContext({
			session: { user: { id: user.id } },
		});

		const caller = appRouter.createCaller(ctx);
		const result = await caller.user.getProfile();

		expect(result.email).toBe("test@example.com");
		expect(result.name).toBe("Test User");
	});

	test("updateProfile updates user data", async () => {
		const user = await db.user.create({
			data: { email: "test@example.com", name: "Old Name" },
		});

		const ctx = await createContext({
			session: { user: { id: user.id } },
		});

		const caller = appRouter.createCaller(ctx);
		const result = await caller.user.updateProfile({
			name: "New Name",
		});

		expect(result.name).toBe("New Name");
	});

	test("throws NOT_FOUND for non-existent user", async () => {
		const ctx = await createContext({
			session: { user: { id: "non-existent-id" } },
		});

		const caller = appRouter.createCaller(ctx);

		await expect(caller.user.getProfile()).rejects.toThrow("User not found");
	});

	test("requires authentication for protected procedures", async () => {
		const ctx = await createContext({ session: null });
		const caller = appRouter.createCaller(ctx);

		await expect(caller.user.getProfile()).rejects.toThrow("UNAUTHORIZED");
	});
});
```

## Error Handling Standards

### Client-Side Error Handling

**TanStack Query error handling:**
```typescript
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function UserProfile() {
	const { data, error, isLoading } = useQuery({
		queryKey: ["user", "profile"],
		queryFn: () => trpc.user.getProfile.query(),
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
	});

	if (error) {
		// Show user-friendly error
		toast.error("Failed to load profile. Please try again.");

		// Log for debugging
		console.error("Profile load error:", error);

		return <ErrorState />;
	}

	if (isLoading) return <LoadingState />;

	return <ProfileView user={data} />;
}
```

**Global error handler:**
```typescript
// main.tsx
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			// Only show error toasts if we have a query
			if (query.state.data !== undefined) {
				toast.error(`Something went wrong: ${error.message}`);
			}
		},
	}),
	defaultOptions: {
		queries: {
			retry: 1,
			staleTime: 1000 * 60 * 5, // 5 minutes
		},
	},
});
```

### Server-Side Error Handling

**Always use try-catch:**
```typescript
export const userRouter = router({
	deleteAccount: protectedProcedure
		.input(z.object({ password: z.string() }))
		.mutation(async ({ ctx, input }) => {
			try {
				// Verify password
				const user = await ctx.db.user.findUnique({
					where: { id: ctx.session.user.id },
				});

				if (!user) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "User not found",
					});
				}

				// Perform deletion
				await ctx.db.user.delete({
					where: { id: user.id },
				});

				return { success: true };
			} catch (error) {
				// Log error for monitoring
				console.error("Account deletion failed:", error);

				// Re-throw TRPCError
				if (error instanceof TRPCError) {
					throw error;
				}

				// Wrap unknown errors
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to delete account",
					cause: error,
				});
			}
		}),
});
```

## Logging Standards

### Development Logging

**Use console methods appropriately:**
```typescript
console.log("Info message");     // General information
console.warn("Warning message"); // Warnings
console.error("Error message");  // Errors
console.debug("Debug message");  // Debug info (filtered in production)
```

### Production Logging

**Remove console.log in production:**

Biome catches `console.log` as a code smell. Use a proper logging library:

```typescript
// lib/logger.ts
const isDev = process.env.NODE_ENV === "development";

export const logger = {
	info: (message: string, ...args: unknown[]) => {
		if (isDev) console.log(`[INFO] ${message}`, ...args);
	},
	warn: (message: string, ...args: unknown[]) => {
		console.warn(`[WARN] ${message}`, ...args);
	},
	error: (message: string, ...args: unknown[]) => {
		console.error(`[ERROR] ${message}`, ...args);
	},
	debug: (message: string, ...args: unknown[]) => {
		if (isDev) console.debug(`[DEBUG] ${message}`, ...args);
	},
};

// Usage
logger.info("User logged in", { userId: user.id });
logger.error("Database query failed", error);
```

## Performance Monitoring

### Key Metrics to Track

1. **Page Load Time** - Time to interactive
2. **API Response Time** - tRPC procedure execution
3. **Database Query Time** - Prisma queries
4. **Bundle Size** - JavaScript payload

### Bundle Size Analysis

**Vite bundle analyzer:**
```bash
bunx vite-bundle-visualizer
```

**Or add to package.json:**
```json
{
	"scripts": {
		"analyze": "vite-bundle-visualizer"
	}
}
```

## Code Review Checklist

Before submitting code:

### Functionality
- [ ] Code works as intended
- [ ] Edge cases handled
- [ ] Error handling implemented
- [ ] No console.log statements

### Type Safety
- [ ] All functions typed
- [ ] No `any` types
- [ ] Type assertions justified
- [ ] `tsc --noEmit` passes

### Code Quality
- [ ] `bun run check` passes
- [ ] `bun run check-types` passes
- [ ] No unused imports/variables
- [ ] Follows naming conventions

### Security
- [ ] Input validation with Zod
- [ ] Authentication checks
- [ ] No sensitive data exposed
- [ ] SQL injection prevented

### Performance
- [ ] Efficient database queries
- [ ] Proper indexes used
- [ ] No unnecessary re-renders
- [ ] Images optimized

### Testing
- [ ] Backend critical paths tested (API, auth, database)
- [ ] Edge cases covered
- [ ] Tests pass (`vitest run`)
- [ ] No UI/component tests (backend only)

### Documentation
- [ ] Complex logic commented
- [ ] JSDoc for public APIs
- [ ] README updated (if needed)

## Continuous Integration

### GitHub Actions Workflow

**`.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Check formatting and linting
        run: bun run check

      - name: Type check
        run: bun run check-types

      - name: Run tests
        run: vitest run

      - name: Build
        run: bun run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  deploy:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: echo "Deploy steps here"
```

## Best Practices

1. **Backend testing only** - Focus on API, auth, database logic (NO UI tests)
2. **Use Vitest** for all tests - Fast, Vite-native test runner
3. **Write tests for critical functionality** - Auth, payments, data mutations, tRPC procedures
4. **Type everything** - No `any`, use strict TypeScript with explicit return types
5. **Use inline types** - Object destructuring with inline types for function parameters
6. **Validate all inputs** - Use Zod schemas in tRPC procedures
7. **Handle errors gracefully** - User-friendly messages, proper error codes
8. **Keep functions small** - Max 50 lines ideally with single responsibility
9. **Use meaningful names** - Clear, descriptive variable/function names
10. **Comment complex logic** - Explain WHY, not WHAT
11. **Run checks before commit** - Pre-commit hooks with Biome
12. **Review your own code** - Before requesting review
13. **Keep dependencies updated** - Regular `bun update`

## Quality Metrics

Aim for:
- **Test Coverage:** >70% for critical paths
- **Type Coverage:** 100% (strict TypeScript)
- **Build Time:** <2 minutes
- **Lint Errors:** 0
- **TypeScript Errors:** 0
- **Bundle Size:** <500kb (initial)
- **Lighthouse Score:** >90 (performance, accessibility)
