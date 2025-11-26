---
title: Teams API
description: Team management and collaboration - Growth Phase Feature
---

# 👥 Teams API

## Overview

The Teams domain enables **multi-user collaboration** by allowing organizations to manage multiple users, projects, and billing under a single account. Essential for agency and enterprise customers who need centralized management, team-wide settings, and role-based access control.

**Status:** 🚀 Growth Phase (Month 3-6)

---

## 📌 Quick Reference

### Growth Phase Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `team.create` | Mutation | Yes | Create new team |
| `team.getById` | Query | Yes | Get team details |
| `team.getAll` | Query | Yes | List user's teams |
| `team.update` | Mutation | Yes | Update team settings |
| `team.delete` | Mutation | Yes | Delete team |
| `team.addMember` | Mutation | Yes | Add team member |
| `team.removeMember` | Mutation | Yes | Remove team member |
| `team.updateMemberRole` | Mutation | Yes | Change member role |
| `team.getMembers` | Query | Yes | List team members |
| `team.transferOwnership` | Mutation | Yes | Transfer team ownership |

### Future Endpoints

#### Scale Phase (Month 6+)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `team.updateBilling` | Mutation | Yes | Update billing info | High |
| `team.getUsage` | Query | Yes | Get usage stats | High |
| `team.inviteByEmail` | Mutation | Yes | Send email invitation | Medium |
| `team.updateBranding` | Mutation | Yes | Update team logo/colors | Low |
| `team.getAuditLog` | Query | Yes | Activity audit log | Medium |

---

## 📦 Data Models

### Team

```typescript
interface Team {
  id: string;                      // Unique team ID
  name: string;                    // Team display name
  slug: string;                    // URL-safe unique slug
  description?: string;            // Team description
  logo?: string;                   // Team logo URL
  ownerId: string;                 // Team owner user ID
  
  // Settings
  defaultProjectRole: "editor" | "reviewer" | "viewer"; // Default role for new members
  allowMemberInvites: boolean;     // Can members invite others?
  
  // Counts
  memberCount: number;             // Total members
  projectCount: number;            // Total projects
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
  deletedAt?: DateTime;            // Soft delete
}
```

### TeamMember

```typescript
interface TeamMember {
  id: string;                      // Membership ID
  teamId: string;                  // Parent team
  userId: string;                  // User account
  role: "owner" | "admin" | "member"; // Team role
  invitedBy?: string;              // Who invited this member
  joinedAt: DateTime;              // When they joined
}
```

### Invitation

```typescript
interface Invitation {
  id: string;                      // Invitation ID
  type: "team" | "project";        // What they're invited to
  teamId?: string;                 // Team (if team invite)
  projectId?: string;              // Project (if project invite)
  email: string;                   // Invitee email
  userId?: string;                 // User ID (if registered)
  invitedBy: string;               // Inviter user ID
  role: string;                    // Assigned role
  token: string;                   // Unique invitation token
  status: "pending" | "accepted" | "declined" | "expired" | "canceled";
  expiresAt: DateTime;             // Expiration time
  respondedAt?: DateTime;          // When responded
  message?: string;                // Optional message
  createdAt: DateTime;
}
```

### Drizzle Schema

```typescript
// packages/db/src/schema/team.ts

export const team = sqliteTable(
  "team",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    logo: text("logo"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    defaultProjectRole: text("default_project_role", {
      enum: ["editor", "reviewer", "viewer"],
    })
      .default("viewer")
      .notNull(),
    allowMemberInvites: integer("allow_member_invites", { mode: "boolean" })
      .default(false)
      .notNull(),
    memberCount: integer("member_count").default(1).notNull(),
    projectCount: integer("project_count").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("team_owner_idx").on(table.ownerId),
    index("team_slug_idx").on(table.slug),
  ],
);

export const teamMember = sqliteTable(
  "team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] })
      .default("member")
      .notNull(),
    invitedBy: text("invited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("team_member_team_idx").on(table.teamId),
    index("team_member_user_idx").on(table.userId),
    index("team_member_unique_idx").on(table.teamId, table.userId),
  ],
);

export const invitation = sqliteTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    type: text("type", { enum: ["team", "project"] }).notNull(),
    teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    token: text("token").notNull().unique(),
    status: text("status", {
      enum: ["pending", "accepted", "declined", "expired", "canceled"],
    })
      .default("pending")
      .notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
    message: text("message"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("invitation_email_idx").on(table.email),
    index("invitation_token_idx").on(table.token),
    index("invitation_team_idx").on(table.teamId),
    index("invitation_project_idx").on(table.projectId),
    index("invitation_status_idx").on(table.status),
  ],
);
```

---

## 🚀 Growth Phase Endpoints

### 1. team.create

**Status:** 🚀 Growth Phase

**Purpose:** Create a new team (user becomes owner)

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Any authenticated user

**Input Schema:**

```typescript
{
  name: z.string().min(1).max(100).trim(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).trim(),
  description: z.string().max(500).trim().optional(),
  defaultProjectRole: z.enum(["editor", "reviewer", "viewer"]).default("viewer"),
  allowMemberInvites: z.boolean().default(false),
}
```

**Response Schema:**

```typescript
{
  team: Team & {
    owner: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  };
}
```

**Example Request:**

```typescript
const { team } = await trpc.team.create.mutate({
  name: "Acme Studios",
  slug: "acme-studios",
  description: "Video production team for Acme Corp",
  defaultProjectRole: "reviewer",
  allowMemberInvites: true,
});
```

**Example Response:**

```json
{
  "team": {
    "id": "team_abc123",
    "name": "Acme Studios",
    "slug": "acme-studios",
    "description": "Video production team for Acme Corp",
    "ownerId": "user_xyz789",
    "defaultProjectRole": "reviewer",
    "allowMemberInvites": true,
    "memberCount": 1,
    "projectCount": 0,
    "createdAt": "2025-01-15T14:30:00Z",
    "owner": {
      "id": "user_xyz789",
      "name": "John Doe",
      "email": "john@acme.com",
      "image": "https://cdn.koko.com/avatars/john.jpg"
    }
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `CONFLICT` - Slug already taken
- `BAD_REQUEST` - Invalid slug format

**Business Rules:**

1. Slug must be globally unique
2. Creator automatically becomes team owner
3. Creator automatically added as team member with "owner" role
4. `memberCount` initialized to 1
5. `projectCount` initialized to 0
6. Slug cannot be changed after creation
7. Slug must be lowercase alphanumeric with hyphens only

**Database Operations:**

```typescript
// Check slug availability
const existing = await db.query.team.findFirst({
  where: eq(team.slug, input.slug),
});

if (existing) {
  throw new TRPCError({
    code: "CONFLICT",
    message: "Team slug already taken",
  });
}

// Create team
const [newTeam] = await db.insert(team).values({
  id: generateId(),
  name: input.name,
  slug: input.slug,
  description: input.description,
  ownerId: ctx.session.user.id,
  defaultProjectRole: input.defaultProjectRole,
  allowMemberInvites: input.allowMemberInvites,
  memberCount: 1,
  projectCount: 0,
}).returning();

// Add creator as owner member
await db.insert(teamMember).values({
  id: generateId(),
  teamId: newTeam.id,
  userId: ctx.session.user.id,
  role: "owner",
  joinedAt: new Date(),
});
```

**Side Effects:**

- Team created
- Creator added as team member with "owner" role
- Notification sent to creator (welcome message)

---

### 2. team.getById

**Status:** 🚀 Growth Phase

**Purpose:** Get team details with member count and settings

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be team member

**Input Schema:**

```typescript
{
  id: z.string(),
  includeMembers: z.boolean().default(false),
}
```

**Response Schema:**

```typescript
{
  team: Team & {
    owner: {
      id: string;
      name: string;
      image?: string;
    };
    members?: Array<TeamMember & {
      user: {
        id: string;
        name: string;
        email: string;
        image?: string;
      };
    }>;
    currentUserRole: "owner" | "admin" | "member";
  };
}
```

**Example Request:**

```typescript
const { team } = await trpc.team.getById.query({
  id: "team_abc123",
  includeMembers: true,
});
```

**Example Response:**

```json
{
  "team": {
    "id": "team_abc123",
    "name": "Acme Studios",
    "slug": "acme-studios",
    "description": "Video production team",
    "memberCount": 5,
    "projectCount": 12,
    "defaultProjectRole": "reviewer",
    "currentUserRole": "admin",
    "owner": {
      "id": "user_xyz789",
      "name": "John Doe"
    },
    "members": [
      {
        "id": "tm_001",
        "role": "owner",
        "joinedAt": "2025-01-01T00:00:00Z",
        "user": {
          "id": "user_xyz789",
          "name": "John Doe",
          "email": "john@acme.com"
        }
      }
    ]
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not a team member
- `NOT_FOUND` - Team does not exist

**Business Rules:**

1. Only team members can view team details
2. `currentUserRole` included for permission checks
3. Members only included if `includeMembers=true`
4. Members sorted by role (owner → admin → member) then by joinedAt

---

### 3. team.getAll

**Status:** 🚀 Growth Phase

**Purpose:** List all teams where user is a member

**Type:** Query

**Auth Required:** Yes

**Permissions:** Any authenticated user

**Input Schema:**

```typescript
{
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  teams: Array<Team & {
    currentUserRole: "owner" | "admin" | "member";
    owner: {
      id: string;
      name: string;
    };
  }>;
  nextCursor?: string;
  total: number;
}
```

**Example Request:**

```typescript
const { teams, total } = await trpc.team.getAll.query({
  limit: 20,
});
```

**Example Response:**

```json
{
  "teams": [
    {
      "id": "team_abc123",
      "name": "Acme Studios",
      "slug": "acme-studios",
      "memberCount": 5,
      "projectCount": 12,
      "currentUserRole": "owner",
      "createdAt": "2025-01-01T00:00:00Z",
      "owner": {
        "id": "user_xyz789",
        "name": "John Doe"
      }
    }
  ],
  "total": 3
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in

**Business Rules:**

1. Returns only teams where user is a member
2. Sorted by team name (alphabetical)
3. Includes current user's role in each team
4. Deleted teams excluded

---

### 4. team.update

**Status:** 🚀 Growth Phase

**Purpose:** Update team settings and metadata

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be team owner or admin

**Input Schema:**

```typescript
{
  id: z.string(),
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  logo: z.string().url().optional(),
  defaultProjectRole: z.enum(["editor", "reviewer", "viewer"]).optional(),
  allowMemberInvites: z.boolean().optional(),
}
```

**Response Schema:**

```typescript
{
  team: Team;
}
```

**Example Request:**

```typescript
const { team } = await trpc.team.update.mutate({
  id: "team_abc123",
  name: "Acme Studios Pro",
  allowMemberInvites: true,
  defaultProjectRole: "editor",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not owner or admin
- `NOT_FOUND` - Team does not exist

**Business Rules:**

1. Only owner or admin can update team
2. Slug cannot be changed (immutable)
3. `updatedAt` timestamp updated
4. At least one field must be provided

**Database Operations:**

```typescript
// Check permissions
const membership = await db.query.teamMember.findFirst({
  where: and(
    eq(teamMember.teamId, input.id),
    eq(teamMember.userId, ctx.session.user.id)
  ),
});

if (!membership || !["owner", "admin"].includes(membership.role)) {
  throw new TRPCError({ code: "FORBIDDEN" });
}

// Update team
const [updated] = await db.update(team)
  .set({
    name: input.name,
    description: input.description,
    logo: input.logo,
    defaultProjectRole: input.defaultProjectRole,
    allowMemberInvites: input.allowMemberInvites,
    updatedAt: new Date(),
  })
  .where(eq(team.id, input.id))
  .returning();
```

**Side Effects:**

- Team metadata updated
- Activity log entry created (Scale phase)
- Team members notified of changes (if significant)

---

### 5. team.delete

**Status:** 🚀 Growth Phase

**Purpose:** Delete a team (soft delete)

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be team owner only

**Input Schema:**

```typescript
{
  id: z.string(),
  confirmationText: z.string().refine((val) => val === "DELETE"),
}
```

**Response Schema:**

```typescript
{
  success: boolean;
}
```

**Example Request:**

```typescript
await trpc.team.delete.mutate({
  id: "team_abc123",
  confirmationText: "DELETE",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not team owner
- `NOT_FOUND` - Team does not exist
- `BAD_REQUEST` - Confirmation text incorrect
- `CONFLICT` - Team has active projects

**Business Rules:**

1. Only team owner can delete team
2. Must type "DELETE" for confirmation
3. Cannot delete team with active projects
4. Soft delete: Sets `deletedAt` timestamp
5. Hard delete after 30 days (background job)
6. All team members removed
7. All invitations canceled

**Database Operations:**

```typescript
// Check ownership
const teamData = await db.query.team.findFirst({
  where: eq(team.id, input.id),
});

if (teamData.ownerId !== ctx.session.user.id) {
  throw new TRPCError({ code: "FORBIDDEN" });
}

// Check for active projects
if (teamData.projectCount > 0) {
  throw new TRPCError({
    code: "CONFLICT",
    message: "Cannot delete team with active projects",
  });
}

// Soft delete team
await db.update(team)
  .set({ deletedAt: new Date() })
  .where(eq(team.id, input.id));

// Remove all members
await db.delete(teamMember)
  .where(eq(teamMember.teamId, input.id));

// Cancel pending invitations
await db.update(invitation)
  .set({ status: "canceled" })
  .where(and(
    eq(invitation.teamId, input.id),
    eq(invitation.status, "pending")
  ));
```

**Side Effects:**

- Team soft deleted
- All members removed
- Pending invitations canceled
- Notification sent to all members

---

### 6. team.addMember

**Status:** 🚀 Growth Phase

**Purpose:** Add existing user to team

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be team owner or admin (or member if `allowMemberInvites=true`)

**Input Schema:**

```typescript
{
  teamId: z.string(),
  userId: z.string(),
  role: z.enum(["admin", "member"]).default("member"),
}
```

**Response Schema:**

```typescript
{
  member: TeamMember & {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  };
}
```

**Example Request:**

```typescript
const { member } = await trpc.team.addMember.mutate({
  teamId: "team_abc123",
  userId: "user_def456",
  role: "admin",
});
```

**Example Response:**

```json
{
  "member": {
    "id": "tm_new123",
    "teamId": "team_abc123",
    "userId": "user_def456",
    "role": "admin",
    "invitedBy": "user_xyz789",
    "joinedAt": "2025-01-15T14:30:00Z",
    "user": {
      "id": "user_def456",
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No permission to add members
- `NOT_FOUND` - Team or user does not exist
- `CONFLICT` - User already a team member
- `BAD_REQUEST` - Cannot add owner role

**Business Rules:**

1. Owner or admin can add members
2. Members can add if `allowMemberInvites=true`
3. Cannot add user who is already a member
4. Cannot add "owner" role (use transferOwnership)
5. Team's `memberCount` incremented
6. Notification sent to new member

**Database Operations:**

```typescript
// Check if user already a member
const existing = await db.query.teamMember.findFirst({
  where: and(
    eq(teamMember.teamId, input.teamId),
    eq(teamMember.userId, input.userId)
  ),
});

if (existing) {
  throw new TRPCError({
    code: "CONFLICT",
    message: "User is already a team member",
  });
}

// Add member
const [newMember] = await db.insert(teamMember).values({
  id: generateId(),
  teamId: input.teamId,
  userId: input.userId,
  role: input.role,
  invitedBy: ctx.session.user.id,
  joinedAt: new Date(),
}).returning();

// Increment member count
await db.update(team)
  .set({ memberCount: sql`${team.memberCount} + 1` })
  .where(eq(team.id, input.teamId));
```

**Side Effects:**

- Team member added
- Team's `memberCount` incremented
- Notification sent to new member
- Activity log entry created

---

### 7. team.removeMember

**Status:** 🚀 Growth Phase

**Purpose:** Remove member from team

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be team owner or admin, or the member themselves

**Input Schema:**

```typescript
{
  teamId: z.string(),
  userId: z.string(),
}
```

**Response Schema:**

```typescript
{
  success: boolean;
}
```

**Example Request:**

```typescript
await trpc.team.removeMember.mutate({
  teamId: "team_abc123",
  userId: "user_def456",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No permission to remove member
- `NOT_FOUND` - Team or member does not exist
- `CONFLICT` - Cannot remove team owner

**Business Rules:**

1. Owner or admin can remove any member
2. Members can remove themselves
3. Cannot remove team owner (must transfer ownership first)
4. Team's `memberCount` decremented
5. User loses access to all team projects
6. Notification sent to removed member

**Database Operations:**

```typescript
// Check if trying to remove owner
const memberToRemove = await db.query.teamMember.findFirst({
  where: and(
    eq(teamMember.teamId, input.teamId),
    eq(teamMember.userId, input.userId)
  ),
});

if (memberToRemove.role === "owner") {
  throw new TRPCError({
    code: "CONFLICT",
    message: "Cannot remove team owner. Transfer ownership first.",
  });
}

// Remove member
await db.delete(teamMember)
  .where(and(
    eq(teamMember.teamId, input.teamId),
    eq(teamMember.userId, input.userId)
  ));

// Decrement member count
await db.update(team)
  .set({ memberCount: sql`${team.memberCount} - 1` })
  .where(eq(team.id, input.teamId));
```

**Side Effects:**

- Team member removed
- Team's `memberCount` decremented
- User removed from all team projects
- Notification sent to removed member
- Activity log entry created

---

### 8. team.updateMemberRole

**Status:** 🚀 Growth Phase

**Purpose:** Change a team member's role

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be team owner or admin

**Input Schema:**

```typescript
{
  teamId: z.string(),
  userId: z.string(),
  role: z.enum(["admin", "member"]),
}
```

**Response Schema:**

```typescript
{
  member: TeamMember & {
    user: {
      id: string;
      name: string;
    };
  };
}
```

**Example Request:**

```typescript
const { member } = await trpc.team.updateMemberRole.mutate({
  teamId: "team_abc123",
  userId: "user_def456",
  role: "admin",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not owner or admin
- `NOT_FOUND` - Team or member does not exist
- `CONFLICT` - Cannot change owner role

**Business Rules:**

1. Only owner or admin can change roles
2. Cannot change owner role (use transferOwnership)
3. Cannot change own role (prevents self-demotion)
4. Notification sent to affected member

**Database Operations:**

```typescript
// Check if trying to modify owner
const member = await db.query.teamMember.findFirst({
  where: and(
    eq(teamMember.teamId, input.teamId),
    eq(teamMember.userId, input.userId)
  ),
});

if (member.role === "owner") {
  throw new TRPCError({
    code: "CONFLICT",
    message: "Cannot change owner role",
  });
}

// Prevent self-modification
if (input.userId === ctx.session.user.id) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Cannot change your own role",
  });
}

// Update role
const [updated] = await db.update(teamMember)
  .set({ role: input.role })
  .where(and(
    eq(teamMember.teamId, input.teamId),
    eq(teamMember.userId, input.userId)
  ))
  .returning();
```

**Side Effects:**

- Member role updated
- Notification sent to member
- Activity log entry created

---

### 9. team.getMembers

**Status:** 🚀 Growth Phase

**Purpose:** List all team members with roles

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be team member

**Input Schema:**

```typescript
{
  teamId: z.string(),
  role: z.enum(["owner", "admin", "member"]).optional(), // Filter by role
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  members: Array<TeamMember & {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
    inviter?: {
      id: string;
      name: string;
    };
  }>;
  nextCursor?: string;
  total: number;
}
```

**Example Request:**

```typescript
const { members, total } = await trpc.team.getMembers.query({
  teamId: "team_abc123",
  role: "admin", // Only admins
});
```

**Example Response:**

```json
{
  "members": [
    {
      "id": "tm_001",
      "teamId": "team_abc123",
      "userId": "user_xyz789",
      "role": "owner",
      "joinedAt": "2025-01-01T00:00:00Z",
      "user": {
        "id": "user_xyz789",
        "name": "John Doe",
        "email": "john@acme.com",
        "image": "https://cdn.koko.com/avatars/john.jpg"
      }
    },
    {
      "id": "tm_002",
      "teamId": "team_abc123",
      "userId": "user_def456",
      "role": "admin",
      "invitedBy": "user_xyz789",
      "joinedAt": "2025-01-05T10:00:00Z",
      "user": {
        "id": "user_def456",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "inviter": {
        "id": "user_xyz789",
        "name": "John Doe"
      }
    }
  ],
  "total": 5
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not a team member
- `NOT_FOUND` - Team does not exist

**Business Rules:**

1. Only team members can view member list
2. Sorted by role (owner → admin → member) then by joinedAt
3. Includes who invited each member (if applicable)

---

### 10. team.transferOwnership

**Status:** 🚀 Growth Phase

**Purpose:** Transfer team ownership to another member

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be current team owner

**Input Schema:**

```typescript
{
  teamId: z.string(),
  newOwnerId: z.string(),
  confirmationText: z.string().refine((val) => val === "TRANSFER"),
}
```

**Response Schema:**

```typescript
{
  team: Team & {
    owner: {
      id: string;
      name: string;
    };
  };
}
```

**Example Request:**

```typescript
const { team } = await trpc.team.transferOwnership.mutate({
  teamId: "team_abc123",
  newOwnerId: "user_def456",
  confirmationText: "TRANSFER",
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not current team owner
- `NOT_FOUND` - Team or new owner does not exist
- `BAD_REQUEST` - Confirmation text incorrect, or new owner not a member

**Business Rules:**

1. Only current owner can transfer ownership
2. New owner must already be a team member
3. Must type "TRANSFER" for confirmation
4. Current owner becomes admin
5. New owner's role becomes "owner"
6. Cannot transfer to self (no-op)
7. Notification sent to new owner and all admins

**Database Operations:**

```typescript
// Verify new owner is a member
const newOwnerMembership = await db.query.teamMember.findFirst({
  where: and(
    eq(teamMember.teamId, input.teamId),
    eq(teamMember.userId, input.newOwnerId)
  ),
});

if (!newOwnerMembership) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "New owner must be a team member",
  });
}

// Update team owner
await db.update(team)
  .set({ ownerId: input.newOwnerId })
  .where(eq(team.id, input.teamId));

// Update new owner's role
await db.update(teamMember)
  .set({ role: "owner" })
  .where(and(
    eq(teamMember.teamId, input.teamId),
    eq(teamMember.userId, input.newOwnerId)
  ));

// Demote current owner to admin
await db.update(teamMember)
  .set({ role: "admin" })
  .where(and(
    eq(teamMember.teamId, input.teamId),
    eq(teamMember.userId, ctx.session.user.id)
  ));
```

**Side Effects:**

- Team owner changed
- New owner role set to "owner"
- Previous owner role set to "admin"
- Notification sent to new owner
- Notification sent to all admins
- Activity log entry created

---

## 🔮 Future Endpoints

### Scale Phase

#### team.updateBilling
**Priority:** High  
**Purpose:** Update team billing information  
**Why Later:** MVP uses individual billing, teams need enterprise billing  
**Complexity:** Complex (payment integration)

**Use Cases:**
- Add payment method for team subscription
- Update billing contact
- Change billing address

---

#### team.getUsage
**Priority:** High  
**Purpose:** Get team usage statistics and quotas  
**Why Later:** MVP has simple quotas, teams need detailed analytics  
**Complexity:** Medium (aggregation queries)

**Example:**
```typescript
const { usage } = await trpc.team.getUsage.query({
  teamId: "team_abc123",
  period: "month",
});

// Returns: storage used, videos uploaded, members active, etc.
```

---

#### team.inviteByEmail
**Priority:** Medium  
**Purpose:** Send email invitation to non-users  
**Why Later:** `addMember` covers existing users first  
**Complexity:** Medium (email sending, token generation)

**Implementation:**
- Generate unique invitation token
- Send email with invitation link
- Create pending invitation record
- User signs up and auto-joins team

---

#### team.updateBranding
**Priority:** Low  
**Purpose:** Customize team logo, colors, and branding  
**Why Later:** Nice-to-have for enterprise customers  
**Complexity:** Simple (metadata update)

**Example:**
```typescript
await trpc.team.updateBranding.mutate({
  teamId: "team_abc123",
  logo: "https://cdn.acme.com/logo.png",
  primaryColor: "#0066CC",
  secondaryColor: "#FF6600",
});
```

---

#### team.getAuditLog
**Priority:** Medium  
**Purpose:** View team activity audit log  
**Why Later:** Compliance feature for enterprise  
**Complexity:** Medium (activity tracking system)

**Events Tracked:**
- Member added/removed
- Role changed
- Settings updated
- Project created/deleted
- Ownership transferred

---

## 🎯 Team Roles & Permissions

### Role Hierarchy

```
Owner (1 per team)
  ├─ Full control over team
  ├─ Delete team
  ├─ Transfer ownership
  ├─ Manage billing
  └─ All admin permissions

Admin (Multiple allowed)
  ├─ Add/remove members
  ├─ Update team settings
  ├─ Manage projects
  └─ Change member roles (except owner)

Member (Multiple allowed)
  ├─ View team details
  ├─ Access team projects (per project role)
  └─ Invite members (if allowMemberInvites=true)
```

### Permission Matrix

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| View team details | ✅ | ✅ | ✅ |
| Update team settings | ✅ | ✅ | ❌ |
| Delete team | ✅ | ❌ | ❌ |
| Add members | ✅ | ✅ | ⚠️ (if allowed) |
| Remove members | ✅ | ✅ | ❌ (only self) |
| Change roles | ✅ | ✅ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ✅ |
| View team usage | ✅ | ✅ | ❌ |

---

## 🔔 Team Notifications

### Notification Events

| Event | Who Gets Notified |
|-------|-------------------|
| Member added to team | New member |
| Member removed from team | Removed member |
| Role changed | Affected member, all admins |
| Ownership transferred | New owner, old owner, all admins |
| Team settings updated | All admins |
| Team deleted | All members |

---

## 🧪 Testing Scenarios

### Growth Phase Testing
- [ ] Create team with unique slug
- [ ] Create team with duplicate slug (should fail)
- [ ] Get team details as member
- [ ] Get team details as non-member (should fail)
- [ ] Update team settings as owner
- [ ] Update team settings as member (should fail)
- [ ] Add member to team
- [ ] Add duplicate member (should fail)
- [ ] Remove member as admin
- [ ] Remove team owner (should fail)
- [ ] Update member role as owner
- [ ] Update own role (should fail)
- [ ] Transfer ownership to member
- [ ] Transfer ownership to non-member (should fail)
- [ ] Delete team with projects (should fail)
- [ ] Delete team as admin (should fail)
- [ ] List all user's teams
- [ ] List team members with pagination

### Edge Cases
- [ ] Team with max members (quota limit)
- [ ] Transfer ownership to self (no-op)
- [ ] Remove last admin (should warn)
- [ ] Member invites when allowMemberInvites=false
- [ ] Slug validation (special characters)
- [ ] Very long team names (100 chars)
- [ ] Concurrent member additions

---

## 📚 Related Documentation

- [Users API](./02-users) - Team members
- [Projects API](./03-projects) - Team projects
- [Permissions API](./09-permissions) - Role-based access *(Post-Launch)*
- [Billing API](./13-billing) - Team subscriptions *(Scale Phase)*
- [Invitations API](./15-invitations) - Email invitations *(Growth Phase)*

---

## 🔗 External Resources

- [Team Collaboration Best Practices](https://www.nngroup.com/articles/team-collaboration/)
- [Role-Based Access Control (RBAC)](https://en.wikipedia.org/wiki/Role-based_access_control)
- [Multi-Tenancy Architecture Patterns](https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/multi-tenancy.html)
