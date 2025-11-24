# Monorepo Workflow

## Turborepo Configuration

**Build Orchestration:** Turborepo v2.5.4

**Configuration File:** `turbo.json` at repository root

```json
{
	"$schema": "https://turbo.build/schema.json",
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": ["dist/**", ".next/**", "build/**"]
		},
		"dev": {
			"cache": false,
			"persistent": true
		},
		"check": {
			"dependsOn": ["^check"]
		},
		"check-types": {
			"dependsOn": ["^build"]
		}
	}
}
```

## Workspace Structure

### Root `package.json`

```json
{
	"name": "novi",
	"private": true,
	"workspaces": ["apps/*", "packages/*"],
	"scripts": {
		"dev": "turbo run dev",
		"dev:web": "turbo run dev --filter=web",
		"dev:server": "turbo run dev --filter=server",
		"build": "turbo run build",
		"check": "turbo run check",
		"check-types": "turbo run check-types",
		"db:push": "turbo run db:push"
	},
	"devDependencies": {
		"turbo": "2.5.4",
		"@biomejs/biome": "2.2.0"
	}
}
```

### Workspace Packages

Defined in `package.json`:

```json
{
	"workspaces": [
		"apps/*",      // Applications (web, server, docs)
		"packages/*"   // Shared packages (api, auth, db, config)
	]
}
```

## Package Dependencies

### Internal Dependencies

Use `workspace:*` protocol for internal packages:

```json
{
	"name": "web",
	"dependencies": {
		"@novi/api": "workspace:*",
		"@novi/auth": "workspace:*",
		"@novi/db": "workspace:*"
	}
}
```

**Benefits:**
- Always uses local version
- Automatic updates when packages change
- Type safety across packages

### Catalog Dependencies

Shared external dependencies use workspace catalog:

**Root `package.json`:**
```json
{
	"catalog": {
		"react": "19.1.0",
		"@tanstack/react-query": "5.85.5",
		"@tanstack/react-router": "1.114.25",
		"typescript": "5.8.2",
		"zod": "3.24.1"
	}
}
```

**Package `package.json`:**
```json
{
	"dependencies": {
		"react": "catalog:",
		"@tanstack/react-query": "catalog:",
		"zod": "catalog:"
	}
}
```

**Benefits:**
- Single source of truth for versions
- Consistent versions across packages
- Easy to update globally

## Turborepo Tasks

### Task Dependencies

Use `dependsOn` to define task order:

```json
{
	"tasks": {
		"build": {
			"dependsOn": ["^build"],  // Build dependencies first
			"outputs": ["dist/**"]
		},
		"check-types": {
			"dependsOn": ["^build"]  // Build packages before type checking
		}
	}
}
```

**`^build`** means "build dependencies first" (caret means upstream)

### Running Tasks

**All workspaces:**
```bash
turbo run build        # Build all apps and packages
turbo run dev          # Start all dev servers
turbo run check        # Lint and format all
```

**Specific workspace:**
```bash
turbo run dev --filter=web          # Only web app
turbo run build --filter=server     # Only server app
turbo run db:push --filter=@artellio/db  # Only db package
```

**Multiple workspaces:**
```bash
turbo run dev --filter=web --filter=server
```

**With dependencies:**
```bash
turbo run build --filter=web...     # web and its dependencies
```

### Task Outputs

Specify outputs for caching:

```json
{
	"tasks": {
		"build": {
			"outputs": [
				"dist/**",      // TypeScript build output
				".next/**",     // Next.js build (if using)
				"build/**"      // Vite build output
			]
		}
	}
}
```

### Persistent Tasks

Dev servers should be persistent:

```json
{
	"tasks": {
		"dev": {
			"cache": false,      // Don't cache dev server
			"persistent": true   // Keep running
		}
	}
}
```

## Package Scripts

### Recommended Scripts

**Apps (`apps/web/package.json`):**
```json
{
	"scripts": {
		"dev": "vite",
		"build": "vite build",
		"preview": "vite preview",
		"check": "biome check --write .",
		"check-types": "tsc --noEmit"
	}
}
```

**Packages (`packages/api/package.json`):**
```json
{
	"scripts": {
		"build": "tsc",
		"dev": "tsc --watch",
		"check": "biome check --write ."
	}
}
```

**Database (`packages/db/package.json`):**
```json
{
	"scripts": {
		"db:push": "prisma db push",
		"db:generate": "prisma generate",
		"db:studio": "prisma studio",
		"build": "prisma generate && tsc"
	}
}
```

## Development Workflow

### Starting Development

**All apps:**
```bash
bun run dev
```

This starts:
- `apps/web` - Frontend dev server (Vite)
- `apps/server` - Backend dev server (Bun)
- `apps/docs` - Docs dev server (Astro)

**Single app:**
```bash
bun run dev:web     # Frontend only
bun run dev:server  # Backend only
```

### Making Changes

1. **Modify code** in any package or app
2. **Turborepo watches** for changes
3. **Dependent packages rebuild** automatically
4. **Dev servers hot reload**

### Adding Dependencies

**To a specific workspace:**
```bash
cd apps/web
bun add react-hook-form
```

**To root (dev dependencies):**
```bash
bun add -D vitest
```

**To catalog (shared version):**

1. Add to root `package.json` catalog:
```json
{
	"catalog": {
		"react-hook-form": "7.50.0"
	}
}
```

2. Reference in workspace:
```json
{
	"dependencies": {
		"react-hook-form": "catalog:"
	}
}
```

3. Install:
```bash
bun install
```

### Creating New Packages

1. **Create directory:**
```bash
mkdir packages/my-package
cd packages/my-package
```

2. **Initialize `package.json`:**
```json
{
	"name": "@artellio/my-package",
	"version": "0.0.0",
	"private": true,
	"type": "module",
	"exports": {
		".": "./src/index.ts"
	},
	"scripts": {
		"build": "tsc",
		"dev": "tsc --watch"
	},
	"dependencies": {},
	"devDependencies": {
		"typescript": "catalog:"
	}
}
```

3. **Add `tsconfig.json`:**
```json
{
	"extends": "@artellio/config/tsconfig.base.json",
	"compilerOptions": {
		"outDir": "dist",
		"rootDir": "src"
	},
	"include": ["src"]
}
```

4. **Create source file:**
```bash
mkdir src
touch src/index.ts
```

5. **Use in other packages:**
```json
{
	"dependencies": {
		"@artellio/my-package": "workspace:*"
	}
}
```

## Build Process

### Production Build

```bash
bun run build
```

**Build order (via `dependsOn`):**
1. `packages/db` - Generate Prisma client, compile TypeScript
2. `packages/auth` - Compile TypeScript
3. `packages/api` - Compile TypeScript
4. `apps/server` - Bundle with tsdown
5. `apps/web` - Build with Vite
6. `apps/docs` - Build with Astro

### Build Outputs

```
apps/web/dist/          # Vite production build (static files)
apps/server/dist/       # Bundled server binary
apps/docs/dist/         # Static site files
packages/*/dist/        # Compiled JavaScript + types
```

### Type Checking

```bash
bun run check-types
```

Runs TypeScript compiler in `--noEmit` mode for all packages.

## Caching

### How Turborepo Caching Works

Turborepo caches task outputs based on:
- Input files (source code)
- Dependencies
- Environment variables
- Configuration files

**Cache hit:** Task skipped, outputs restored from cache
**Cache miss:** Task runs, outputs cached for next time

### Cache Configuration

**Inputs (automatic):**
- All files in workspace
- Files in dependencies
- `package.json`
- `turbo.json`

**Outputs (manual):**
```json
{
	"tasks": {
		"build": {
			"outputs": ["dist/**"]
		}
	}
}
```

### Disabling Cache

```json
{
	"tasks": {
		"dev": {
			"cache": false  // Never cache dev server
		}
	}
}
```

### Force Re-run

```bash
turbo run build --force  # Ignore cache, run all tasks
```

### Remote Caching

For CI/CD and team sharing:

```bash
turbo login
turbo link
```

Then builds are cached remotely and shared across team.

## Code Quality

### Pre-commit Hooks

**Husky + lint-staged:**

`.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

bunx lint-staged
```

`package.json`:
```json
{
	"lint-staged": {
		"*.{ts,tsx,js,jsx,json}": [
			"biome check --write --no-errors-on-unmatched"
		]
	}
}
```

**Workflow:**
1. Stage files: `git add .`
2. Commit: `git commit -m "message"`
3. Husky runs lint-staged
4. Biome formats and lints staged files
5. If successful, commit completes

### Running Checks Manually

```bash
# Format and lint all files
bun run check

# Type check all packages
bun run check-types

# Both
bun run check && bun run check-types
```

## Package Versioning

All packages use `0.0.0` version (monorepo doesn't need versions).

If publishing packages:

```bash
# Install changesets
bun add -D @changesets/cli

# Initialize
bunx changeset init

# Create changeset
bunx changeset

# Version packages
bunx changeset version

# Publish
bunx changeset publish
```

## Bun Workspaces

**Configuration (`bunfig.toml`):**

```toml
[install]
peer = true
auto = "fallback"

[install.lockfile]
save = true

[install.cache]
disable = false

[install.scopes]
"@artellio" = { "resolution" = "workspace" }
```

**Key behaviors:**
- `peer = true` - Install peer dependencies
- `resolution = "workspace"` - Resolve `@artellio/*` packages from workspace

## Troubleshooting

### Dependency Issues

**Clear and reinstall:**
```bash
rm -rf node_modules
rm bun.lockb
bun install
```

**Rebuild packages:**
```bash
turbo run build --force
```

### Type Errors

**Ensure packages are built:**
```bash
turbo run build --filter=@artellio/db
turbo run build --filter=@artellio/api
```

**Restart TypeScript server** in your editor.

### Cache Issues

**Clear Turbo cache:**
```bash
rm -rf .turbo
turbo run build --force
```

## Best Practices

1. **Use workspace protocol** for internal dependencies (`workspace:*`)
2. **Use catalog** for shared external dependencies
3. **Define task dependencies** in `turbo.json`
4. **Specify outputs** for cacheable tasks
5. **Keep packages focused** - Single responsibility
6. **Export clean APIs** - Only export what's needed
7. **Use path aliases** - `@/*` for imports within package
8. **Run checks before commit** - Use pre-commit hooks
9. **Type everything** - Leverage cross-package type safety
10. **Document complex packages** - Add README.md

## CI/CD Integration

**Example GitHub Actions:**

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run check
      - run: bun run check-types
      - run: bun run build
```

**With Turbo remote cache:**

```yaml
- run: bunx turbo build --token=${{ secrets.TURBO_TOKEN }}
```
