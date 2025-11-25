# Architecture & Monorepo

## Overview

**Koko** is a video collaboration platform using a **Turborepo monorepo** with React 19 frontend and Hono + tRPC backend.

## Structure

```
koko/
├── apps/
│   ├── web/         # React 19 + Vite + TanStack Router
│   ├── server/      # Hono + tRPC API
│   └── docs/        # Astro Starlight
├── packages/
│   ├── api/         # tRPC routers & procedures
│   ├── auth/        # Better-Auth setup
│   ├── db/          # Drizzle ORM + SQLite/Turso
│   └── config/      # Shared tsconfig
├── turbo.json       # Task orchestration
└── biome.json       # Linting & formatting
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TanStack Router/Query, TailwindCSS, shadcn/ui |
| Backend | Hono, tRPC v11, Better-Auth |
| Database | SQLite/Turso via Drizzle ORM |
| Build | Turborepo, Vite, tsdown |
| Runtime | Bun v1.1.38 |

## Dependency Graph

```
apps/web ──┬──> @koko/api ──┬──> @koko/db
           └──> @koko/auth ─┘

apps/server ─┬──> @koko/api ──┬──> @koko/db
             └──> @koko/auth ─┘
```

## Key Commands

```bash
bun run dev              # Start all dev servers
bun run dev:web          # Frontend only
bun run dev:server       # Backend only
bun run build            # Production build
bun run check            # Lint & format
bun run check-types      # TypeScript check
```

## Turborepo Tasks

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "check": { "dependsOn": ["^check"] },
    "check-types": { "dependsOn": ["^build"] }
  }
}
```

**Filter by workspace:**
```bash
turbo run build --filter=web        # Single workspace
turbo run build --filter=web...     # With dependencies
```

## Package Dependencies

**Internal** - Use `workspace:*`:
```json
{ "@koko/api": "workspace:*", "@koko/db": "workspace:*" }
```

**External** - Use catalog in root package.json:
```json
{ "catalog": { "react": "19.1.0", "zod": "3.24.1" } }
```

Reference with `"react": "catalog:"` in workspace package.json.

## Adding Features

1. `packages/db/src/schema/` - Drizzle schema
2. `packages/api/src/routers/` - tRPC router
3. `apps/web/src/components/` - UI components
4. `apps/web/src/routes/` - Page routes

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite/Turso connection |
| `CORS_ORIGIN` | Allowed origins (comma-separated) |
| `VITE_SERVER_URL` | Backend API URL |

## Troubleshooting

```bash
rm -rf node_modules && rm bun.lockb && bun install  # Dependency issues
turbo run build --force                              # Rebuild all
rm -rf .turbo && turbo run build --force            # Clear cache
```
