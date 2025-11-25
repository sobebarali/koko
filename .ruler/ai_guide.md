# AI Assistant Guide

## Before Starting Any Task

1. Read relevant `.ruler/*.md` files
2. Understand the architecture (see `architecture.md`)
3. Check existing patterns in the codebase
4. Plan the approach before coding

## Task Analysis

**Ask clarifying questions if:**
- Requirements are ambiguous
- Multiple implementation approaches exist
- Security implications are unclear
- Breaking changes may be introduced

**Use TodoWrite for:**
- Complex multi-step tasks (3+ steps)
- Features requiring multiple file changes
- Database migrations

## Implementation Order

For new features:
1. **Database** (`packages/db`) - Drizzle schema, migrations
2. **API** (`packages/api`) - tRPC router, Zod validation
3. **Frontend** (`apps/web`) - Components, routes, queries
4. **Validation** - Type check, lint, test

## Code Generation Rules

**Always:**
- Use existing patterns from the codebase
- Follow TypeScript strict mode
- Explicit return types on all functions
- Inline types for function parameters
- Validate inputs with Zod
- Permission checks on mutations
- Add database indexes for queries

**Never:**
- Use `any` type
- Skip input validation
- Expose sensitive data
- Use `console.log` in production
- Create unnecessary abstractions

## Modifying Existing Code

1. **Read first** - Always read the file before editing
2. **Match style** - Follow existing patterns
3. **Minimal changes** - Only modify what's necessary
4. **Update related code** - Keep everything in sync

## Communication

**Ask questions when:**
- Requirements unclear
- Multiple valid approaches
- Security implications
- Breaking changes possible

**Use TodoWrite to:**
- Track multi-step progress
- Mark tasks `in_progress` when starting
- Mark `completed` immediately when done

## Quality Checklist

Before marking complete:

- [ ] `bun run check` passes (lint/format)
- [ ] `bun run check-types` passes
- [ ] No `any` types
- [ ] Input validation with Zod
- [ ] Permission checks on mutations
- [ ] Error handling implemented
- [ ] No sensitive data exposed
- [ ] Tests for critical paths (backend)

## Key Patterns

**See `development.md` for:**
- tRPC procedures
- Drizzle schema/queries
- React components
- TanStack Query/Router

**See `standards.md` for:**
- TypeScript rules
- Naming conventions
- Security requirements
- Testing patterns
