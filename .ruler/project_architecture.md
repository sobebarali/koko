# Project Architecture

## Overview

**Novi** is a managed-first video collaboration platform for creative teams. The project follows a **monorepo architecture** using Turborepo with clear separation between applications and shared packages.

## Project Purpose

Enable creative teams to review, collaborate, and manage video projects with:
- Real-time feedback and annotations
- Professional-grade collaboration tools
- Managed infrastructure for reliability
- Team management and permissions

## Monorepo Structure

```
novi/
├── apps/                          # Deployable applications
│   ├── web/                       # Frontend React SPA
│   ├── server/                    # Backend API server
│   └── docs/                      # Astro Starlight documentation
│
├── packages/                      # Shared packages (internal libraries)
│   ├── api/                       # tRPC API definitions
│   ├── auth/                      # Authentication logic
│   ├── db/                        # Database schema & models
│   └── config/                    # Shared configurations
│
├── package.json                   # Workspace root configuration
├── turbo.json                     # Turborepo task orchestration
└── biome.json                     # Code quality configuration
```

## Dependency Graph

```
┌─────────────┐
│  apps/web   │
└──────┬──────┘
       │
       ├────────────┐
       │            │
       v            v
┌──────────┐  ┌──────────┐
│  @novi/   │  │  @novi/  │
│   api     │  │  auth    │
└─────┬────┘  └────┬─────┘
      │            │
      └─────┬──────┘
            v
      ┌──────────┐
      │  @novi/  │
      │    db    │
      └──────────┘

┌──────────────┐
│ apps/server  │
└──────┬───────┘
       │
       ├────────────┐
       │            │
       v            v
┌──────────┐  ┌──────────┐
│  @novi/   │  │  @novi/  │
│   api     │  │  auth    │
└─────┬────┘  └────┬─────┘
      │            │
      └─────┬──────┘
            v
      ┌──────────┐
      │  @novi/  │
      │    db    │
      └──────────┘
```

## Application Layer

### apps/web - Frontend Application

**Framework:** React 19 + Vite + TanStack Router

**Purpose:** User-facing web application for video collaboration

**Key Technologies:**
- React 19.1.0 (UI framework)
- TanStack Router v1.114.25 (file-based routing)
- TanStack Query v5.85.5 (server state)
- TailwindCSS v4.0.15 (styling)
- shadcn/ui (component library)

**Directory Structure:**
```
apps/web/
├── src/
│   ├── routes/              # File-based routes (TanStack Router)
│   │   ├── __root.tsx      # Root layout
│   │   ├── index.tsx       # Home page
│   │   └── ...
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   └── ...             # Feature components
│   ├── lib/                 # Utilities & helpers
│   │   ├── trpc.ts         # tRPC client
│   │   └── utils.ts        # Utility functions
│   └── main.tsx            # Application entry point
├── public/                  # Static assets
└── vite.config.ts          # Vite configuration
```

**Deployment:** Alchemy to managed infrastructure

### apps/server - Backend API

**Framework:** Fastify + tRPC

**Purpose:** API server handling business logic and data operations

**Key Technologies:**
- Fastify v5.3.3 (HTTP server)
- tRPC v11.5.0 (type-safe API)
- Better-Auth v1.3.28 (authentication)
- tsx (development) / tsdown (production bundler)

**Directory Structure:**
```
apps/server/
├── src/
│   └── index.ts            # Server entry point
└── tsdown.config.ts        # Build configuration
```

**Deployment:** Standalone Node.js binary or containerized

### apps/docs - Documentation Site

**Framework:** Astro Starlight

**Purpose:** Project documentation, API references, guides

**Directory Structure:**
```
apps/docs/
├── src/
│   ├── content/
│   │   └── docs/           # Markdown documentation
│   └── ...
└── astro.config.mjs        # Astro configuration
```

**Deployment:** Static site generation

## Package Layer

### packages/api - API Definitions

**Purpose:** Centralized tRPC router definitions and business logic

**Exports:**
- `appRouter` - Main tRPC router
- `createContext` - Request context factory
- Individual routers (auth, todo, etc.)

**Directory Structure:**
```
packages/api/
├── src/
│   ├── root.ts             # Root router (merges all routers)
│   ├── init.ts             # tRPC initialization & middleware
│   ├── context.ts          # Context creation
│   └── routers/            # Feature-specific routers
│       ├── auth.ts
│       ├── todo.ts
│       └── ...
└── package.json
```

**Key Patterns:**
- Type-safe procedures (publicProcedure, protectedProcedure)
- Zod input validation
- Centralized error handling

### packages/auth - Authentication

**Purpose:** Authentication logic using Better-Auth

**Exports:**
- `auth` - Better-Auth instance
- `authClient` - Client-side auth utilities
- Session management functions

**Directory Structure:**
```
packages/auth/
├── src/
│   ├── auth.ts             # Better-Auth server setup
│   └── auth-client.ts      # Client-side auth
└── package.json
```

**Features:**
- Email/password authentication
- Session management
- Polar.sh integration for payments

### packages/db - Database Layer

**Purpose:** Mongoose ORM setup and database models

**Exports:**
- `db` - Mongoose connection instance
- Model exports (User, Post, etc.)
- Type definitions

**Directory Structure:**
```
packages/db/
├── src/
│   ├── index.ts            # Mongoose connection & exports
│   └── models/             # Mongoose schema models
│       ├── user.ts         # User model
│       ├── session.ts      # Session model
│       └── ...             # Other models
└── package.json
```

**Database:** MongoDB via Mongoose

**Key Patterns:**
- Model-based schema organization
- Type-safe queries with TypeScript
- Middleware and virtuals
- Schema validation

### packages/config - Shared Configuration

**Purpose:** Shared TypeScript configurations

**Exports:**
- Base tsconfig.json

**Usage:** Extended by individual apps and packages

```json
{
	"extends": "@novi/config/tsconfig.base.json"
}
```

## Layered Architecture

The project follows a **three-tier architecture**:

### 1. Presentation Layer (apps/web)
- React components
- UI state management
- Routing and navigation
- User interactions

### 2. Business Logic Layer (packages/api)
- tRPC procedures
- Input validation
- Authorization checks
- Data transformations

### 3. Data Layer (packages/db + packages/auth)
- Database operations
- Data models
- Authentication
- Session management

**Data Flow:**

```
User Interaction (UI Component)
    ↓
TanStack Query Hook
    ↓
tRPC Client
    ↓ HTTP Request
tRPC Server (Fastify)
    ↓
Router Procedure
    ↓
Mongoose Models
    ↓
MongoDB Database
```

## Build System

### Turborepo Tasks

Defined in `turbo.json`:

```json
{
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": ["dist/**"]
		},
		"dev": {
			"cache": false,
			"persistent": true
		},
		"check": {
			"dependsOn": ["^check"]
		}
	}
}
```

**Task Execution:**
- `npm run build` - Builds all apps and packages in dependency order
- `npm run dev` - Starts all dev servers concurrently
- `npm run check` - Runs linting and formatting

### Build Outputs

- **apps/web:** `dist/` (Vite production build)
- **apps/server:** `dist/` (tsdown bundled output)
- **packages/*:** `dist/` (TypeScript compiled output)

### Caching Strategy

Turborepo caches task outputs based on:
- Input files (source code)
- Dependencies
- Environment variables
- Configuration files

## Package Management

### Workspace Protocol

Internal dependencies use `workspace:*`:

```json
{
	"dependencies": {
		"@novi/api": "workspace:*",
		"@novi/auth": "workspace:*",
		"@novi/db": "workspace:*"
	}
}
```

### Catalog Dependencies

Shared external dependencies are managed via workspace catalog:

```json
{
	"catalog": {
		"react": "19.1.0",
		"@tanstack/react-router": "1.114.25"
	}
}
```

Apps reference catalog versions with `catalog:` prefix:

```json
{
	"dependencies": {
		"react": "catalog:"
	}
}
```

## Runtime Environment

**Primary Runtime:** Node.js with npm

**Package Manager:** npm@11.3.0

**Development Tools:**
- tsx for TypeScript execution in development
- tsdown for production bundling
- Turborepo for monorepo orchestration
- Vitest for testing

**Environment Variables:**

Required for development:
- `DATABASE_URL` - MongoDB connection string
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)
- `VITE_SERVER_URL` - Backend API URL (for frontend)

Optional:
- `POLAR_SUCCESS_URL` - Payment success redirect
- `ALCHEMY_PASSWORD` - Deployment password

## Module Resolution

All packages use path aliases for clean imports:

**tsconfig.json:**
```json
{
	"compilerOptions": {
		"paths": {
			"@/*": ["./src/*"]
		}
	}
}
```

**Usage:**
```typescript
// Good
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

// Bad
import { Button } from "../../../components/ui/button";
```

## Design Principles

1. **Separation of Concerns** - Clear boundaries between layers
2. **Type Safety** - End-to-end TypeScript with strict mode
3. **Code Reusability** - Shared packages for common logic
4. **Developer Experience** - Fast dev server, instant feedback
5. **Scalability** - Modular architecture for growth
6. **Maintainability** - Consistent patterns and conventions
7. **Performance** - Optimized builds, efficient data fetching

## Adding New Features

When adding a new feature:

1. **Create Mongoose models** in `packages/db/src/models/`
2. **Define tRPC router** in `packages/api/src/routers/`
3. **Build UI components** in `apps/web/src/components/`
4. **Create routes** in `apps/web/src/routes/`
5. **Add documentation** in `apps/docs/`

Example: Adding "Projects" feature

```
1. packages/db/src/models/project.ts
2. packages/api/src/routers/project.ts
3. apps/web/src/components/project-list.tsx
4. apps/web/src/routes/projects/index.tsx
5. apps/docs/src/content/docs/features/projects.md
```

## Deployment Architecture

```
┌────────────────┐
│   apps/web     │ → Alchemy → Managed CDN/Edge
└────────────────┘

┌────────────────┐
│  apps/server   │ → Docker/Node.js → Cloud Container
└────────────────┘

┌────────────────┐
│   apps/docs    │ → SSG → Static Hosting
└────────────────┘

┌────────────────┐
│    MongoDB     │ → Managed Database (Atlas, etc.)
└────────────────┘
```

## Performance Considerations

1. **Code Splitting** - Route-based in TanStack Router
2. **Tree Shaking** - Vite optimizes bundle size
3. **Caching** - TanStack Query + Turborepo
4. **Database Indexes** - Optimized MongoDB queries
5. **CDN Delivery** - Static assets via CDN
6. **Server Compilation** - tsdown minifies server code
