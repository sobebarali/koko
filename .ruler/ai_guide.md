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

## Connected Dependencies

When building or modifying code, always identify and update connected pieces:

### API Changes
When creating or modifying an API endpoint:
1. **Identify connections** - Find APIs that:
   - Call this API internally
   - Are called by this API
   - Share the same data models
2. **Check for cascading updates** - If your change affects:
   - Input schema → Update all callers
   - Output schema → Update all consumers
   - Database schema → Update all related queries
3. **Update connected APIs** - Make necessary changes to maintain consistency

### Frontend Changes
When creating or modifying frontend code:
1. **Identify connections** - Find components that:
   - Consume the same API/data
   - Share state or props
   - Are parent/child relationships
2. **Check for cascading updates** - If your change affects:
   - API response shape → Update all consuming components
   - Shared types → Update all usages
   - Query keys → Update invalidation patterns
3. **Update connected components** - Make necessary changes to maintain consistency

**Always ask:** "What else depends on this? What will break if I change this?"

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

- [ ] `npm run check` passes (lint/format)
- [ ] `npm run check-types` passes
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
