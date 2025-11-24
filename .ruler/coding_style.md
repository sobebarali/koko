# Coding Style Guide

## Language & Runtime

- **Primary Language:** TypeScript v5.8.2
- **Runtime:** Bun v1.1.38
- **Module System:** ESNext with bundler module resolution
- **Target:** ESNext for modern JavaScript features

## Code Formatting

### Biome Configuration

All code MUST be formatted using Biome v2.2.0. The project uses these settings:

- **Indentation:** Tabs (NOT spaces)
- **Line Width:** 100 characters
- **Quotes:** Double quotes for JavaScript/TypeScript
- **Quote Properties:** As needed only
- **Semicolons:** Always required
- **Trailing Commas:** All (including function parameters)
- **Bracket Spacing:** True
- **Arrow Parentheses:** Always

### Imports Organization

- **Organized Imports:** Always enabled
- **Sort Order:** Automatic via Biome
- **Unused Imports:** Must be removed
- **Import Style:** ES modules only (never `require()`)

### Tailwind Classes

Tailwind CSS classes MUST be sorted using the official plugin. The following function names trigger sorting:
- `cn` (from `@/lib/utils`)
- `clsx`
- `cva` (Class Variance Authority)

## TypeScript Standards

### Configuration

- **Strict Mode:** Always enabled
- **No Unchecked Indexed Access:** Enforced
- **No Unused Locals:** Error
- **No Unused Parameters:** Error
- **Exact Optional Property Types:** Enabled
- **Verbatim Module Syntax:** Enabled

### Type Safety Rules

1. **Never use `any`** - Use `unknown` for truly unknown types
2. **Avoid type assertions** - Only use when absolutely necessary with `as const` or specific types
3. **Explicit return types** - Required for ALL functions (not just exported ones)
4. **Use inline types for parameters** - Object destructuring with inline types instead of interfaces
5. **Interfaces only for React props** - When extending React component types
6. **No inferrable types** - Don't explicitly type when TypeScript can infer (enforced by Biome)
7. **Use `as const` assertions** - For literal types and readonly arrays/objects

```typescript
// Good
const routes = ["/", "/about", "/contact"] as const;
type Route = typeof routes[number];

// Bad
const routes: string[] = ["/", "/about", "/contact"];
```

### Type Definitions

1. **Use inline types for function parameters** - Object destructuring with inline types
2. **Use interfaces ONLY for React component props** (when extending React types)
3. **Use type aliases for unions, intersections, and utilities**
4. **Export types alongside implementations**
5. **Use generic constraints** when needed

```typescript
// Good - Function with inline object destructuring
function getUserById({ userId, includeProfile = false }: {
	userId: string;
	includeProfile?: boolean;
}): Promise<User> {
	// Implementation
}

// Good - React component with interface (extends React types)
interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
	variant?: "default" | "outline" | "ghost";
}

// Good - Type aliases for unions
type Status = "active" | "inactive" | "pending";

// Bad - Separate interface for regular function parameters
interface GetUserParams {
	userId: string;
	includeProfile?: boolean;
}
function getUserById(params: GetUserParams) { } // Don't do this
```

## Naming Conventions

### Files & Directories

- **Files:** kebab-case (e.g., `user-menu.tsx`, `auth-client.ts`)
- **Directories:** kebab-case (e.g., `components/ui/`, `lib/utils/`)
- **Test files:** Same name with `.test.ts` or `.test.tsx` suffix
- **Type definition files:** Same name with `.d.ts` suffix

### Code Elements

- **Components:** PascalCase (e.g., `UserMenu`, `AuthProvider`)
- **Functions:** camelCase (e.g., `getUserById`, `handleSubmit`)
- **Variables:** camelCase (e.g., `userData`, `isLoading`)
- **Constants:** camelCase with `as const` (e.g., `defaultConfig as const`)
- **Enums:** PascalCase for name, UPPER_CASE for values (prefer unions instead)
- **Interfaces:** PascalCase, NO `I` prefix (e.g., `User`, not `IUser`)
- **Type Aliases:** PascalCase (e.g., `RouteParams`, `ApiResponse`)
- **Generics:** Single uppercase letter or PascalCase descriptive name (e.g., `T`, `TData`, `TResponse`)

### Special Naming Rules

- **React Hooks:** Must start with `use` (e.g., `useAuth`, `useQueryParams`)
- **Event Handlers:** Prefix with `handle` (e.g., `handleClick`, `handleSubmit`)
- **Boolean Variables:** Prefix with `is`, `has`, `should`, `can` (e.g., `isLoading`, `hasError`)
- **Private Methods:** Prefix with `_` only when necessary (prefer encapsulation)
- **Unused Variables:** Prefix with `_` (e.g., `_unusedParam`)

## Function & Component Patterns

### React Components

1. **Always use function components** (never class components)
2. **Use TypeScript for props**
3. **Export as named exports** (not default exports unless required by framework)
4. **Destructure props** in function parameters

```typescript
// Good
interface UserCardProps {
	user: User;
	onEdit?: (id: string) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
	return (
		<div>
			<h2>{user.name}</h2>
			{onEdit && <button onClick={() => onEdit(user.id)}>Edit</button>}
		</div>
	);
}

// Bad
export default function UserCard(props: any) {
	return <div>{props.user.name}</div>;
}
```

### Hooks Usage

1. **Call hooks at top level** (never in conditions, loops, or nested functions)
2. **Follow dependency rules** (exhaustive-deps)
3. **Custom hooks MUST start with `use`**
4. **Extract complex logic into custom hooks**

### Function Declarations

1. **Use inline types with object destructuring** for function parameters
2. **Always specify explicit return types** for all functions
3. **Use arrow functions** for short, single-expression functions
4. **Use function declarations** for named, reusable functions
5. **Keep functions small and focused** (max 50 lines ideally)

```typescript
// Good - Inline types with object destructuring and return type
function createUser({ email, name, role = "user" }: {
	email: string;
	name: string;
	role?: "user" | "admin";
}): Promise<User> {
	return db.user.create({ data: { email, name, role } });
}

// Good - Arrow function with inline types and return type
const updateUserProfile = async ({ userId, data }: {
	userId: string;
	data: { name?: string; bio?: string };
}): Promise<User> => {
	return db.user.update({ where: { id: userId }, data });
};

// Good - Simple arrow function with return type
const double = (n: number): number => n * 2;

// Good - Void return type for side effects
const logMessage = (message: string): void => {
	console.log(message);
};

// Bad - Don't create separate interface for function params
interface CreateUserParams {
	email: string;
	name: string;
	role?: "user" | "admin";
}
function createUser(params: CreateUserParams) { } // Avoid this pattern

// Bad - Missing return type
function createUser({ email }: { email: string }) { } // Missing return type
```

## Error Handling

1. **Use try-catch** for async operations
2. **Never swallow errors** - Always log or propagate
3. **Use typed errors** when possible
4. **Validate at boundaries** (API endpoints, user input)

```typescript
// Good
try {
	const data = await fetchUser(id);
	return data;
} catch (error) {
	if (error instanceof NotFoundError) {
		throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
	}
	throw error;
}

// Bad
try {
	const data = await fetchUser(id);
	return data;
} catch (error) {
	// Silent failure
}
```

## Comments & Documentation

1. **Code should be self-documenting** - Prefer clear naming over comments
2. **Add comments for complex logic** or non-obvious decisions
3. **Use JSDoc** for public APIs and exported functions
4. **Avoid redundant comments** that just repeat the code
5. **Keep comments up-to-date** with code changes

```typescript
// Good - Explains WHY, not WHAT
// Using debounce to prevent API spam during rapid typing
const debouncedSearch = useDebouncedCallback(searchUsers, 300);

// Bad - Obvious comment
// Set the user name
const userName = user.name;

// Good - JSDoc for exported function
/**
 * Formats a date string to ISO 8601 format
 * @param date - The date to format
 * @returns ISO 8601 formatted date string
 */
export function formatDate(date: Date): string {
	return date.toISOString();
}
```

## Import Statements

1. **Use path aliases** (`@/*` instead of relative paths)
2. **Group imports** (external → internal → types)
3. **One import per line** for named imports (readability)
4. **Import only what you need** (tree-shaking)

```typescript
// Good
import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { User } from "@artellio/db";

// Bad
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../../../components/ui/button";
```

## Constants & Configuration

1. **Define constants at module level** with `as const`
2. **Use UPPER_CASE** for truly constant values (rare)
3. **Extract magic numbers/strings** into named constants
4. **Use enums sparingly** (prefer string literal unions)

```typescript
// Good
const routes = {
	home: "/",
	about: "/about",
	contact: "/contact",
} as const;

const MAX_RETRY_ATTEMPTS = 3;

type Theme = "light" | "dark" | "system";

// Bad
if (status === "active") { } // Magic string
if (retries > 3) { } // Magic number
```

## Object & Array Handling

1. **Use destructuring** for cleaner code
2. **Prefer spread operator** over `Object.assign()`
3. **Use optional chaining** (`?.`) for nested properties
4. **Use nullish coalescing** (`??`) for default values

```typescript
// Good
const { name, email } = user;
const updatedUser = { ...user, verified: true };
const userName = user?.profile?.displayName ?? "Anonymous";

// Bad
const name = user.name;
const updatedUser = Object.assign({}, user, { verified: true });
const userName = user.profile ? user.profile.displayName : "Anonymous";
```

## Async/Await

1. **Always use async/await** (never mix with `.then()`)
2. **Handle errors** with try-catch
3. **Parallel operations** use `Promise.all()`
4. **Sequential operations** use await

```typescript
// Good - Parallel
const [user, posts] = await Promise.all([
	fetchUser(id),
	fetchUserPosts(id),
]);

// Good - Sequential (when order matters)
const user = await createUser(data);
await sendWelcomeEmail(user.email);

// Bad - Sequential when could be parallel
const user = await fetchUser(id);
const posts = await fetchUserPosts(id);
```

## Pre-commit Standards

All code MUST pass these checks before commit:

1. **Biome format and lint** - `bun run check`
2. **TypeScript type check** - `bun run check-types`
3. **No console.log** in production code (use proper logging)
4. **Organized imports** with no unused imports

These checks are enforced via Husky pre-commit hooks with lint-staged.
