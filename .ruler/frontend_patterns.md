# Frontend Patterns

## Tech Stack

- **Framework:** React 19.1.0
- **Build Tool:** Vite v6.2.2
- **Routing:** TanStack Router v1.114.25 (file-based)
- **State Management:** TanStack Query v5.85.5 (server state)
- **Styling:** TailwindCSS v4.0.15
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Forms:** TanStack Form v1.12.3
- **Icons:** Lucide React v0.473.0
- **Theming:** next-themes v0.4.6

## Project Structure

```
apps/web/
├── src/
│   ├── routes/              # File-based routing
│   │   ├── __root.tsx      # Root layout
│   │   ├── index.tsx       # Home page (/)
│   │   ├── about.tsx       # About page (/about)
│   │   └── users/
│   │       ├── index.tsx   # Users list (/users)
│   │       └── $id.tsx     # User detail (/users/:id)
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   └── ...             # Feature components
│   ├── lib/
│   │   ├── utils.ts        # Utility functions (cn, etc.)
│   │   └── trpc.ts         # tRPC client
│   ├── hooks/              # Custom React hooks
│   └── main.tsx            # App entry point
└── index.html
```

## React 19 Patterns

### Function Components

**Always use function components** with TypeScript:

```typescript
// Good - Typed function component
interface UserCardProps {
	user: User;
	onEdit?: (id: string) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
	return (
		<div className="rounded-lg border p-4">
			<h3 className="font-semibold">{user.name}</h3>
			<p className="text-sm text-muted-foreground">{user.email}</p>
			{onEdit && (
				<button onClick={() => onEdit(user.id)}>Edit</button>
			)}
		</div>
	);
}

// Bad - Missing types
export function UserCard(props) {
	return <div>{props.user.name}</div>;
}
```

### Component Organization

```typescript
// 1. Imports
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import type { User } from "@novi/db";

// 2. Type definitions
interface UserListProps {
	filter?: string;
}

// 3. Component
export function UserList({ filter }: UserListProps) {
	// 3a. Hooks (always at top level)
	const [selected, setSelected] = useState<string | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["users", filter],
		queryFn: () => trpc.user.list.query({ filter }),
	});

	// 3b. Event handlers
	const handleSelect = (id: string) => {
		setSelected(id);
	};

	// 3c. Early returns
	if (isLoading) return <div>Loading...</div>;
	if (!data) return <div>No data</div>;

	// 3d. Render
	return (
		<div className="space-y-4">
			{data.map((user) => (
				<UserCard
					key={user.id}
					user={user}
					selected={selected === user.id}
					onSelect={handleSelect}
				/>
			))}
		</div>
	);
}
```

### React 19 Features

#### Use Hook

React 19 includes a `use` hook for reading promises and context:

```typescript
import { use } from "react";

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
	const user = use(userPromise); // Suspends until promise resolves

	return <div>{user.name}</div>;
}

// Usage with Suspense
<Suspense fallback={<div>Loading...</div>}>
	<UserProfile userPromise={fetchUser(id)} />
</Suspense>
```

#### Actions (Server Actions pattern)

```typescript
import { useActionState } from "react";

function ContactForm() {
	const [state, submitAction, isPending] = useActionState(
		async (previousState, formData) => {
			const email = formData.get("email") as string;
			// Submit logic
			return { success: true };
		},
		{ success: false }
	);

	return (
		<form action={submitAction}>
			<input name="email" type="email" required />
			<button disabled={isPending}>
				{isPending ? "Submitting..." : "Submit"}
			</button>
		</form>
	);
}
```

## TanStack Router

### File-based Routing

Routes are defined by file structure in `src/routes/`:

```
src/routes/
├── __root.tsx          # Root layout (wraps all routes)
├── index.tsx           # / (home page)
├── about.tsx           # /about
├── users/
│   ├── index.tsx       # /users
│   └── $id.tsx         # /users/:id (dynamic)
└── dashboard/
    ├── index.tsx       # /dashboard
    └── _layout.tsx     # Layout for dashboard routes
```

### Route Definition

**Root Layout (`__root.tsx`):**

```typescript
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});

function RootComponent() {
	return (
		<div>
			<nav>{/* Navigation */}</nav>
			<main>
				<Outlet /> {/* Child routes render here */}
			</main>
			<footer>{/* Footer */}</footer>
		</div>
	);
}
```

**Page Route (`users/$id.tsx`):**

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Route parameter validation
const userSearchSchema = z.object({
	tab: z.enum(["profile", "posts", "settings"]).optional(),
});

export const Route = createFileRoute("/users/$id")({
	// Validate search params
	validateSearch: userSearchSchema,

	// Data loading
	loader: async ({ params, context }) => {
		const user = await context.queryClient.ensureQueryData({
			queryKey: ["user", params.id],
			queryFn: () => trpc.user.getById.query({ id: params.id }),
		});
		return { user };
	},

	// Component
	component: UserDetail,
});

function UserDetail() {
	const { id } = Route.useParams();
	const { tab } = Route.useSearch();
	const { user } = Route.useLoaderData();

	return (
		<div>
			<h1>{user.name}</h1>
			{/* Render based on tab */}
		</div>
	);
}
```

### Navigation

```typescript
import { Link, useNavigate } from "@tanstack/react-router";

function Navigation() {
	const navigate = useNavigate();

	return (
		<nav>
			{/* Declarative navigation */}
			<Link to="/" className="nav-link">
				Home
			</Link>

			<Link
				to="/users/$id"
				params={{ id: "123" }}
				search={{ tab: "profile" }}
			>
				User Profile
			</Link>

			{/* Programmatic navigation */}
			<button
				onClick={() => {
					navigate({ to: "/dashboard" });
				}}
			>
				Go to Dashboard
			</button>
		</nav>
	);
}
```

### Route Context

Share dependencies across routes:

```typescript
// main.tsx
const queryClient = new QueryClient();

const router = createRouter({
	routeTree,
	context: {
		queryClient,
	},
});

// In routes
export const Route = createFileRoute("/users")({
	loader: ({ context }) => {
		// Access queryClient
		return context.queryClient.ensureQueryData(/*...*/);
	},
});
```

## TanStack Query (State Management)

### Query Setup

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

function UserProfile() {
	const queryClient = useQueryClient();

	// Query (read)
	const { data: user, isLoading, error } = useQuery({
		queryKey: ["user", "profile"],
		queryFn: () => trpc.user.getProfile.query(),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	// Mutation (write)
	const updateProfile = useMutation({
		mutationFn: (data: { name: string }) =>
			trpc.user.updateProfile.mutate(data),
		onSuccess: (data) => {
			// Update cache optimistically
			queryClient.setQueryData(["user", "profile"], data);
		},
		onError: (error) => {
			// Handle error
			console.error(error);
		},
	});

	const handleUpdate = () => {
		updateProfile.mutate({ name: "New Name" });
	};

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error.message}</div>;

	return (
		<div>
			<h1>{user.name}</h1>
			<button
				onClick={handleUpdate}
				disabled={updateProfile.isPending}
			>
				{updateProfile.isPending ? "Updating..." : "Update"}
			</button>
		</div>
	);
}
```

### Query Keys

Use consistent, hierarchical query keys:

```typescript
// Good - Hierarchical
["users"] // All users
["users", { filter: "active" }] // Filtered users
["users", userId] // Single user
["users", userId, "posts"] // User's posts

// Bad - Flat
["getAllUsers"]
["user123"]
```

### Invalidation

```typescript
const queryClient = useQueryClient();

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ["users", userId] });

// Invalidate all user queries
queryClient.invalidateQueries({ queryKey: ["users"] });

// Refetch immediately
queryClient.invalidateQueries({
	queryKey: ["users"],
	refetchType: "active",
});
```

### Optimistic Updates

```typescript
const updateTodo = useMutation({
	mutationFn: (data: { id: string; completed: boolean }) =>
		trpc.todo.update.mutate(data),

	onMutate: async (newTodo) => {
		// Cancel outgoing refetches
		await queryClient.cancelQueries({ queryKey: ["todos"] });

		// Snapshot previous value
		const previousTodos = queryClient.getQueryData(["todos"]);

		// Optimistically update
		queryClient.setQueryData(["todos"], (old: Todo[]) =>
			old.map((todo) =>
				todo.id === newTodo.id
					? { ...todo, completed: newTodo.completed }
					: todo
			)
		);

		return { previousTodos };
	},

	onError: (err, newTodo, context) => {
		// Rollback on error
		queryClient.setQueryData(["todos"], context.previousTodos);
	},

	onSettled: () => {
		// Refetch to ensure sync
		queryClient.invalidateQueries({ queryKey: ["todos"] });
	},
});
```

## Styling with TailwindCSS

### Utility Classes

Use Tailwind's utility-first approach:

```tsx
// Good - Utility classes
<div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-md">
	<img src={user.avatar} className="size-12 rounded-full" />
	<div className="flex-1">
		<h3 className="text-lg font-semibold">{user.name}</h3>
		<p className="text-sm text-gray-600">{user.email}</p>
	</div>
</div>

// Bad - Inline styles
<div style={{ display: "flex", padding: "16px" }}>
	...
</div>
```

### Responsive Design

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{items.map((item) => (
		<Card key={item.id} />
	))}
</div>
```

### `cn` Utility

Use the `cn` utility for conditional classes:

```typescript
import { cn } from "@/lib/utils";

interface ButtonProps {
	variant?: "default" | "outline" | "ghost";
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function Button({ variant = "default", size = "md", className }: ButtonProps) {
	return (
		<button
			className={cn(
				"rounded-md font-medium transition-colors",
				{
					"bg-primary text-white hover:bg-primary/90": variant === "default",
					"border border-input hover:bg-accent": variant === "outline",
					"hover:bg-accent": variant === "ghost",
				},
				{
					"h-8 px-3 text-sm": size === "sm",
					"h-10 px-4": size === "md",
					"h-12 px-6 text-lg": size === "lg",
				},
				className
			)}
		/>
	);
}
```

## shadcn/ui Components

### Component Configuration

**Location:** `components.json`

```json
{
	"$schema": "https://ui.shadcn.com/schema.json",
	"style": "new-york",
	"rsc": false,
	"tsx": true,
	"tailwind": {
		"config": "tailwind.config.ts",
		"css": "src/index.css",
		"baseColor": "slate",
		"cssVariables": true
	},
	"aliases": {
		"components": "@/components",
		"utils": "@/lib/utils"
	}
}
```

### Using Components

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>Login</CardTitle>
				<CardDescription>
					Enter your credentials to continue
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input id="password" type="password" />
					</div>
					<Button type="submit" className="w-full">
						Sign In
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
```

### CVA (Class Variance Authority)

Use CVA for component variants:

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
	"inline-flex items-center justify-center rounded-md font-medium transition-colors",
	{
		variants: {
			variant: {
				default: "bg-primary text-white hover:bg-primary/90",
				outline: "border border-input hover:bg-accent",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				destructive: "bg-destructive text-white hover:bg-destructive/90",
			},
			size: {
				sm: "h-8 px-3 text-sm",
				md: "h-10 px-4",
				lg: "h-12 px-6 text-lg",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "md",
		},
	}
);

interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {}

export function Button({ variant, size, className, ...props }: ButtonProps) {
	return (
		<button
			className={buttonVariants({ variant, size, className })}
			{...props}
		/>
	);
}
```

## Form Management

### TanStack Form

```typescript
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { z } from "zod";

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

function LoginForm() {
	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await trpc.auth.login.mutate(value);
		},
		validatorAdapter: zodValidator(),
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.Field
				name="email"
				validators={{
					onChange: loginSchema.shape.email,
				}}
			>
				{(field) => (
					<div>
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
						{field.state.meta.errors && (
							<p className="text-sm text-red-500">
								{field.state.meta.errors[0]}
							</p>
						)}
					</div>
				)}
			</form.Field>

			<Button type="submit">Submit</Button>
		</form>
	);
}
```

## Theme Management

### next-themes Integration

```typescript
// components/theme-provider.tsx
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			{children}
		</NextThemesProvider>
	);
}

// components/theme-toggle.tsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<button
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			className="rounded-md p-2 hover:bg-accent"
		>
			<Sun className="size-5 dark:hidden" />
			<Moon className="hidden size-5 dark:block" />
		</button>
	);
}
```

## Custom Hooks

```typescript
// hooks/use-user.ts
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

export function useUser() {
	return useQuery({
		queryKey: ["user", "current"],
		queryFn: () => trpc.user.getCurrent.query(),
	});
}

// Usage
function Profile() {
	const { data: user, isLoading } = useUser();

	if (isLoading) return <div>Loading...</div>;

	return <div>{user?.name}</div>;
}
```

## Performance Optimization

1. **Code splitting** - Automatic with TanStack Router
2. **Lazy loading** - Use React.lazy() for heavy components
3. **Memoization** - Use useMemo/useCallback when needed
4. **Virtualization** - Use @tanstack/react-virtual for long lists
5. **Image optimization** - Use proper image formats and lazy loading
