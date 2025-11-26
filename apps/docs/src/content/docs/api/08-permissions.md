---
title: Permissions API
description: Fine-grained access control, sharing, roles, and public link management
---

# 🔐 Permissions API

## Overview

The Permissions API provides fine-grained access control for projects, videos, and other resources in Koko. It enables sharing with specific users, creating public share links, managing roles, and controlling who can view, comment, or edit content.

**Key Capabilities:**
- Grant and revoke permissions to users
- Role-based access control (Owner, Editor, Reviewer, Viewer)
- Public share links with password protection
- Expiring links with time-based access
- Email-verified access for secure sharing
- Audit logs for permission changes
- Bulk permission management

**Status:** 🔄 Post-Launch (Month 1-2)

---

## Data Models

### Core Interfaces

```typescript
// Permission roles
type PermissionRole = 
  | "OWNER"      // Full control, can delete
  | "EDITOR"     // Edit content, manage permissions
  | "REVIEWER"   // View, comment, annotate
  | "VIEWER";    // View only

// Resource types
type ResourceType = "project" | "video" | "folder" | "playlist";

// Share link types
type ShareLinkType = 
  | "PUBLIC"           // Anyone with link
  | "PASSWORD"         // Requires password
  | "EMAIL_REQUIRED"   // Requires email verification
  | "EXPIRING";        // Time-limited access

// Permission grant
interface Permission {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  userId: string;
  role: PermissionRole;
  grantedBy: string;
  inheritedFrom?: string;  // Parent resource ID if inherited
  createdAt: Date;
  updatedAt: Date;
}

// Share link
interface ShareLink {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  token: string;             // URL-safe token
  type: ShareLinkType;
  role: PermissionRole;      // Role granted via link
  
  // Security options
  password?: string;         // Hashed password
  requireEmail: boolean;
  allowedEmails?: string[];  // Whitelist
  allowedDomains?: string[]; // Domain whitelist (e.g., "@company.com")
  
  // Expiration
  expiresAt?: Date;
  maxUses?: number;
  currentUses: number;
  
  // Metadata
  label?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
}

// Access grant via share link
interface ShareLinkAccess {
  id: string;
  shareLinkId: string;
  userId?: string;           // If user created account
  email?: string;            // If email-only access
  ipAddress: string;
  userAgent: string;
  accessedAt: Date;
}

// Permission audit log
interface PermissionAuditLog {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  action: "granted" | "revoked" | "updated" | "inherited";
  userId?: string;           // User affected
  role?: PermissionRole;
  previousRole?: PermissionRole;
  performedBy: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Access check result
interface AccessCheck {
  hasAccess: boolean;
  role?: PermissionRole;
  source: "direct" | "inherited" | "sharelink" | "team" | "none";
  resourceId?: string;       // Source resource if inherited
}
```

### API Response Types

```typescript
interface PermissionResponse {
  permission: Permission;
}

interface PermissionListResponse {
  permissions: Permission[];
  total: number;
  directCount: number;
  inheritedCount: number;
}

interface ShareLinkResponse {
  shareLink: ShareLink;
  url: string;
}

interface ShareLinkListResponse {
  shareLinks: ShareLink[];
  total: number;
}

interface AccessCheckResponse {
  access: AccessCheck;
}

interface ShareLinkAccessResponse {
  access: ShareLinkAccess;
  resource: {
    id: string;
    type: ResourceType;
    name: string;
  };
  requiresPassword: boolean;
  requiresEmail: boolean;
}

interface AuditLogResponse {
  logs: PermissionAuditLog[];
  total: number;
}
```

---

## Database Schema

### Drizzle Schema Definition

```typescript
// packages/db/src/schema/permission.ts
import { sqliteTable, text, integer, index, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { project } from "./project";
import { video } from "./video";

// Permission roles enum
export const permissionRoleEnum = ["OWNER", "EDITOR", "REVIEWER", "VIEWER"] as const;

// Resource types enum
export const resourceTypeEnum = ["project", "video", "folder", "playlist"] as const;

// Share link types enum
export const shareLinkTypeEnum = ["PUBLIC", "PASSWORD", "EMAIL_REQUIRED", "EXPIRING"] as const;

// Main permissions table
export const permission = sqliteTable(
  "permission",
  {
    id: text("id").primaryKey(),
    resourceType: text("resource_type", { enum: resourceTypeEnum }).notNull(),
    resourceId: text("resource_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: permissionRoleEnum }).notNull(),
    grantedBy: text("granted_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    inheritedFrom: text("inherited_from"), // Parent resource ID
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("permission_resource_idx").on(t.resourceType, t.resourceId),
    index("permission_user_idx").on(t.userId),
    index("permission_granted_by_idx").on(t.grantedBy),
    unique("permission_resource_user_unique").on(t.resourceType, t.resourceId, t.userId),
  ]
);

// Share links table
export const shareLink = sqliteTable(
  "share_link",
  {
    id: text("id").primaryKey(),
    resourceType: text("resource_type", { enum: resourceTypeEnum }).notNull(),
    resourceId: text("resource_id").notNull(),
    token: text("token").notNull().unique(),
    type: text("type", { enum: shareLinkTypeEnum }).notNull(),
    role: text("role", { enum: permissionRoleEnum }).notNull(),
    
    // Security
    passwordHash: text("password_hash"),
    requireEmail: integer("require_email", { mode: "boolean" }).default(false).notNull(),
    allowedEmails: text("allowed_emails", { mode: "json" }).$type<string[]>(),
    allowedDomains: text("allowed_domains", { mode: "json" }).$type<string[]>(),
    
    // Expiration
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    maxUses: integer("max_uses"),
    currentUses: integer("current_uses").default(0).notNull(),
    
    // Metadata
    label: text("label"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    lastAccessedAt: integer("last_accessed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("share_link_resource_idx").on(t.resourceType, t.resourceId),
    index("share_link_token_idx").on(t.token),
    index("share_link_active_idx").on(t.isActive),
    index("share_link_expires_idx").on(t.expiresAt),
  ]
);

// Share link access log
export const shareLinkAccess = sqliteTable(
  "share_link_access",
  {
    id: text("id").primaryKey(),
    shareLinkId: text("share_link_id")
      .notNull()
      .references(() => shareLink.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    email: text("email"),
    ipAddress: text("ip_address").notNull(),
    userAgent: text("user_agent").notNull(),
    accessedAt: integer("accessed_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("share_link_access_link_idx").on(t.shareLinkId),
    index("share_link_access_user_idx").on(t.userId),
    index("share_link_access_time_idx").on(t.accessedAt),
  ]
);

// Permission audit log
export const permissionAuditLog = sqliteTable(
  "permission_audit_log",
  {
    id: text("id").primaryKey(),
    resourceType: text("resource_type", { enum: resourceTypeEnum }).notNull(),
    resourceId: text("resource_id").notNull(),
    action: text("action", { enum: ["granted", "revoked", "updated", "inherited"] }).notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    role: text("role", { enum: permissionRoleEnum }),
    previousRole: text("previous_role", { enum: permissionRoleEnum }),
    performedBy: text("performed_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("permission_audit_resource_idx").on(t.resourceType, t.resourceId),
    index("permission_audit_user_idx").on(t.userId),
    index("permission_audit_time_idx").on(t.createdAt),
  ]
);

// Permission inheritance cache (for performance)
export const permissionInheritance = sqliteTable(
  "permission_inheritance",
  {
    id: text("id").primaryKey(),
    childType: text("child_type", { enum: resourceTypeEnum }).notNull(),
    childId: text("child_id").notNull(),
    parentType: text("parent_type", { enum: resourceTypeEnum }).notNull(),
    parentId: text("parent_id").notNull(),
    depth: integer("depth").notNull(), // 1 = direct parent, 2+ = grandparent
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    index("permission_inheritance_child_idx").on(t.childType, t.childId),
    index("permission_inheritance_parent_idx").on(t.parentType, t.parentId),
    unique("permission_inheritance_unique").on(t.childType, t.childId, t.parentType, t.parentId),
  ]
);
```

### Relations

```typescript
// packages/db/src/schema/permission.ts (continued)
import { relations } from "drizzle-orm";

export const permissionRelations = relations(permission, ({ one }) => ({
  user: one(user, {
    fields: [permission.userId],
    references: [user.id],
  }),
  grantor: one(user, {
    fields: [permission.grantedBy],
    references: [user.id],
    relationName: "grantor",
  }),
}));

export const shareLinkRelations = relations(shareLink, ({ one, many }) => ({
  creator: one(user, {
    fields: [shareLink.createdBy],
    references: [user.id],
  }),
  accesses: many(shareLinkAccess),
}));

export const shareLinkAccessRelations = relations(shareLinkAccess, ({ one }) => ({
  shareLink: one(shareLink, {
    fields: [shareLinkAccess.shareLinkId],
    references: [shareLink.id],
  }),
  user: one(user, {
    fields: [shareLinkAccess.userId],
    references: [user.id],
  }),
}));

export const permissionAuditLogRelations = relations(permissionAuditLog, ({ one }) => ({
  user: one(user, {
    fields: [permissionAuditLog.userId],
    references: [user.id],
  }),
  performer: one(user, {
    fields: [permissionAuditLog.performedBy],
    references: [user.id],
    relationName: "performer",
  }),
}));
```

---

## API Endpoints

### Post-Launch Phase (Month 1-2)

#### permission.grant

Grants permission to a user for a resource.

```typescript
// Input
interface GrantPermissionInput {
  resourceType: ResourceType;
  resourceId: string;
  userId: string;
  role: PermissionRole;
}

// Example
const { permission } = await trpc.permission.grant.mutate({
  resourceType: "project",
  resourceId: "proj_abc123",
  userId: "user_xyz789",
  role: "REVIEWER",
});
```

#### permission.revoke

Revokes a user's permission.

```typescript
// Input
interface RevokePermissionInput {
  permissionId: string;
}

// Example
await trpc.permission.revoke.mutate({
  permissionId: "perm_123",
});
```

#### permission.update

Updates a user's permission role.

```typescript
// Input
interface UpdatePermissionInput {
  permissionId: string;
  role: PermissionRole;
}

// Example
await trpc.permission.update.mutate({
  permissionId: "perm_123",
  role: "EDITOR",
});
```

#### permission.getAll

Lists all permissions for a resource.

```typescript
// Input
interface GetPermissionsInput {
  resourceType: ResourceType;
  resourceId: string;
  includeDirect?: boolean;
  includeInherited?: boolean;
}

// Example
const { permissions, directCount, inheritedCount } = await trpc.permission.getAll.query({
  resourceType: "project",
  resourceId: "proj_abc123",
  includeDirect: true,
  includeInherited: true,
});
```

#### permission.checkAccess

Checks if a user has access to a resource.

```typescript
// Input
interface CheckAccessInput {
  resourceType: ResourceType;
  resourceId: string;
  userId?: string; // Defaults to current user
  requiredRole?: PermissionRole;
}

// Example
const { access } = await trpc.permission.checkAccess.query({
  resourceType: "video",
  resourceId: "video_abc123",
  requiredRole: "EDITOR",
});
// Returns: { hasAccess: true, role: "OWNER", source: "direct" }
```

#### permission.createShareLink

Creates a public share link.

```typescript
// Input
interface CreateShareLinkInput {
  resourceType: ResourceType;
  resourceId: string;
  type: ShareLinkType;
  role: PermissionRole;
  label?: string;
  password?: string;
  requireEmail?: boolean;
  allowedEmails?: string[];
  allowedDomains?: string[];
  expiresAt?: Date;
  maxUses?: number;
}

// Example
const { shareLink, url } = await trpc.permission.createShareLink.mutate({
  resourceType: "video",
  resourceId: "video_abc123",
  type: "PASSWORD",
  role: "REVIEWER",
  label: "Client Review Link",
  password: "secure123",
  expiresAt: new Date("2024-12-31"),
  maxUses: 100,
});
// url: "https://koko.app/share/Xk9mP2qR"
```

#### permission.getShareLink

Gets share link details.

```typescript
// Input
interface GetShareLinkInput {
  id?: string;
  token?: string; // Either id or token
}

// Example
const { shareLink, url } = await trpc.permission.getShareLink.query({
  id: "link_123",
});
```

#### permission.updateShareLink

Updates share link settings.

```typescript
// Input
interface UpdateShareLinkInput {
  id: string;
  label?: string;
  role?: PermissionRole;
  password?: string;
  expiresAt?: Date;
  maxUses?: number;
  isActive?: boolean;
}

// Example
await trpc.permission.updateShareLink.mutate({
  id: "link_123",
  expiresAt: new Date("2025-01-31"),
  maxUses: 200,
});
```

#### permission.deleteShareLink

Deletes a share link.

```typescript
// Input
interface DeleteShareLinkInput {
  id: string;
}

// Example
await trpc.permission.deleteShareLink.mutate({
  id: "link_123",
});
```

#### permission.accessViaShareLink

Accesses a resource via share link (public endpoint).

```typescript
// Input
interface AccessViaShareLinkInput {
  token: string;
  password?: string;
  email?: string;
}

// Example
const { access, resource, requiresPassword, requiresEmail } = 
  await trpc.permission.accessViaShareLink.mutate({
    token: "Xk9mP2qR",
    password: "secure123",
    email: "user@example.com",
  });
```

### Growth Phase (Month 3-6)

#### permission.bulkGrant

Grants permissions to multiple users at once.

```typescript
// Input
interface BulkGrantInput {
  resourceType: ResourceType;
  resourceId: string;
  grants: Array<{
    userId: string;
    role: PermissionRole;
  }>;
}

// Example
await trpc.permission.bulkGrant.mutate({
  resourceType: "project",
  resourceId: "proj_abc123",
  grants: [
    { userId: "user_1", role: "EDITOR" },
    { userId: "user_2", role: "REVIEWER" },
    { userId: "user_3", role: "VIEWER" },
  ],
});
```

#### permission.bulkRevoke

Revokes multiple permissions.

```typescript
// Input
interface BulkRevokeInput {
  permissionIds: string[];
}

// Example
await trpc.permission.bulkRevoke.mutate({
  permissionIds: ["perm_1", "perm_2", "perm_3"],
});
```

#### permission.transferOwnership

Transfers ownership of a resource.

```typescript
// Input
interface TransferOwnershipInput {
  resourceType: ResourceType;
  resourceId: string;
  newOwnerId: string;
}

// Example
await trpc.permission.transferOwnership.mutate({
  resourceType: "project",
  resourceId: "proj_abc123",
  newOwnerId: "user_xyz789",
});
```

#### permission.getAuditLog

Gets permission change history.

```typescript
// Input
interface GetAuditLogInput {
  resourceType: ResourceType;
  resourceId: string;
  userId?: string;
  action?: "granted" | "revoked" | "updated" | "inherited";
  limit?: number;
  offset?: number;
}

// Example
const { logs, total } = await trpc.permission.getAuditLog.query({
  resourceType: "project",
  resourceId: "proj_abc123",
  limit: 50,
});
```

#### permission.getShareLinkAccesses

Gets access log for a share link.

```typescript
// Input
interface GetShareLinkAccessesInput {
  shareLinkId: string;
  limit?: number;
  offset?: number;
}

// Example
const accesses = await trpc.permission.getShareLinkAccesses.query({
  shareLinkId: "link_123",
  limit: 100,
});
```

#### permission.copyPermissions

Copies permissions from one resource to another.

```typescript
// Input
interface CopyPermissionsInput {
  sourceType: ResourceType;
  sourceId: string;
  targetType: ResourceType;
  targetId: string;
  overwrite?: boolean;
}

// Example
await trpc.permission.copyPermissions.mutate({
  sourceType: "project",
  sourceId: "proj_old",
  targetType: "project",
  targetId: "proj_new",
  overwrite: false,
});
```

### Scale Phase (Month 6+)

#### permission.getInheritancePath

Gets the full inheritance path for permissions.

```typescript
// Input
interface GetInheritancePathInput {
  resourceType: ResourceType;
  resourceId: string;
}

// Example
const path = await trpc.permission.getInheritancePath.query({
  resourceType: "video",
  resourceId: "video_abc123",
});
// Returns: [{ type: "project", id: "proj_123", depth: 1 }, ...]
```

#### permission.exportPermissions

Exports all permissions for a resource as CSV/JSON.

```typescript
// Input
interface ExportPermissionsInput {
  resourceType: ResourceType;
  resourceId: string;
  format: "csv" | "json";
}

// Example
const { downloadUrl } = await trpc.permission.exportPermissions.query({
  resourceType: "project",
  resourceId: "proj_abc123",
  format: "csv",
});
```

---

## Business Rules

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| `resourceId` | Must exist and user must have OWNER/EDITOR access | `NOT_FOUND` / `FORBIDDEN` |
| `userId` | Must exist | `NOT_FOUND` |
| `role` | Cannot grant OWNER (use transfer) | `BAD_REQUEST` |
| `password` | Min 8 characters for share links | `BAD_REQUEST` |
| `expiresAt` | Must be in future | `BAD_REQUEST` |
| `allowedEmails` | Max 100 emails | `BAD_REQUEST` |

### Permission Rules

| Action | Required Permission |
|--------|---------------------|
| Grant permission | `OWNER` or `EDITOR` on resource |
| Revoke permission | `OWNER` or granted the permission |
| Update role | `OWNER` or `EDITOR` |
| Create share link | `EDITOR` or higher |
| Update/delete share link | Creator or `OWNER` |
| Transfer ownership | Current `OWNER` only |
| View audit log | `EDITOR` or higher |

### Role Hierarchy

```
OWNER > EDITOR > REVIEWER > VIEWER
```

- **OWNER**: Full control, can delete resource
- **EDITOR**: Manage content and permissions (cannot delete)
- **REVIEWER**: View, comment, annotate
- **VIEWER**: View only (no comments)

### Inheritance Rules

1. Child resources inherit parent permissions by default
2. Direct permissions override inherited permissions
3. Higher role always takes precedence
4. Revoking parent permission doesn't affect direct grants

**Example:**
- User has `VIEWER` on project (inherited)
- User granted `EDITOR` on video (direct)
- Result: User has `EDITOR` on video

### Limits

| Resource | Free | Pro | Team |
|----------|------|-----|------|
| Collaborators per project | 3 | 25 | 100 |
| Active share links | 5 | 50 | Unlimited |
| Share link max uses | 100 | 1,000 | Unlimited |
| Share link duration | 30 days | 1 year | Unlimited |
| Audit log retention | 30 days | 1 year | 3 years |

---

## tRPC Router Implementation

```typescript
// packages/api/src/routers/permission/index.ts
import { router } from "../../init";
import { grantPermission } from "./grant";
import { revokePermission } from "./revoke";
import { updatePermission } from "./update";
import { getPermissions } from "./get-all";
import { checkAccess } from "./check-access";
import { createShareLink } from "./create-share-link";
import { getShareLink } from "./get-share-link";
import { updateShareLink } from "./update-share-link";
import { deleteShareLink } from "./delete-share-link";
import { accessViaShareLink } from "./access-via-share-link";
import { bulkGrant } from "./bulk-grant";
import { bulkRevoke } from "./bulk-revoke";
import { transferOwnership } from "./transfer-ownership";
import { getAuditLog } from "./get-audit-log";

export const permissionRouter = router({
  // Core permissions
  grant: grantPermission,
  revoke: revokePermission,
  update: updatePermission,
  getAll: getPermissions,
  checkAccess: checkAccess,
  
  // Share links
  createShareLink: createShareLink,
  getShareLink: getShareLink,
  updateShareLink: updateShareLink,
  deleteShareLink: deleteShareLink,
  accessViaShareLink: accessViaShareLink,
  
  // Bulk operations
  bulkGrant: bulkGrant,
  bulkRevoke: bulkRevoke,
  
  // Advanced
  transferOwnership: transferOwnership,
  getAuditLog: getAuditLog,
});
```

### Example Procedure: grant

```typescript
// packages/api/src/routers/permission/grant.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../init";
import { db } from "@koko/db";
import { permission, permissionAuditLog, project, video } from "@koko/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const inputSchema = z.object({
  resourceType: z.enum(["project", "video", "folder", "playlist"]),
  resourceId: z.string(),
  userId: z.string(),
  role: z.enum(["EDITOR", "REVIEWER", "VIEWER"]), // Cannot grant OWNER
});

export const grantPermission = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ ctx, input }): Promise<PermissionResponse> => {
    // Verify resource exists
    const resource = await getResource(input.resourceType, input.resourceId);
    if (!resource) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
    }

    // Check if user has permission to grant (OWNER or EDITOR)
    const hasAccess = await checkResourceAccess(
      ctx.session.user.id,
      input.resourceType,
      input.resourceId,
      "EDITOR"
    );
    if (!hasAccess) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "Insufficient permissions to grant access" 
      });
    }

    // Verify target user exists
    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, input.userId),
    });
    if (!targetUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check collaborator limit
    const collaboratorCount = await db
      .select({ count: sql`count(*)` })
      .from(permission)
      .where(and(
        eq(permission.resourceType, input.resourceType),
        eq(permission.resourceId, input.resourceId)
      ));

    const limit = getUserCollaboratorLimit(ctx.session.user);
    if (collaboratorCount[0].count >= limit) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Collaborator limit reached (${limit})`,
      });
    }

    // Check if permission already exists
    const existing = await db.query.permission.findFirst({
      where: and(
        eq(permission.resourceType, input.resourceType),
        eq(permission.resourceId, input.resourceId),
        eq(permission.userId, input.userId)
      ),
    });

    let newPermission;

    if (existing) {
      // Update existing permission
      [newPermission] = await db
        .update(permission)
        .set({
          role: input.role,
          grantedBy: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(permission.id, existing.id))
        .returning();

      // Log the update
      await db.insert(permissionAuditLog).values({
        id: `audit_${nanoid()}`,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        action: "updated",
        userId: input.userId,
        role: input.role,
        previousRole: existing.role,
        performedBy: ctx.session.user.id,
      });
    } else {
      // Create new permission
      [newPermission] = await db
        .insert(permission)
        .values({
          id: `perm_${nanoid()}`,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          userId: input.userId,
          role: input.role,
          grantedBy: ctx.session.user.id,
        })
        .returning();

      // Log the grant
      await db.insert(permissionAuditLog).values({
        id: `audit_${nanoid()}`,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        action: "granted",
        userId: input.userId,
        role: input.role,
        performedBy: ctx.session.user.id,
      });
    }

    // Invalidate permission cache
    await invalidatePermissionCache(input.resourceType, input.resourceId);

    return { permission: newPermission };
  });
```

### Example Procedure: createShareLink

```typescript
// packages/api/src/routers/permission/create-share-link.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../init";
import { db } from "@koko/db";
import { shareLink } from "@koko/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hash } from "@node-rs/bcrypt";

const inputSchema = z.object({
  resourceType: z.enum(["project", "video", "folder", "playlist"]),
  resourceId: z.string(),
  type: z.enum(["PUBLIC", "PASSWORD", "EMAIL_REQUIRED", "EXPIRING"]),
  role: z.enum(["EDITOR", "REVIEWER", "VIEWER"]),
  label: z.string().max(100).optional(),
  password: z.string().min(8).optional(),
  requireEmail: z.boolean().optional(),
  allowedEmails: z.array(z.string().email()).max(100).optional(),
  allowedDomains: z.array(z.string()).max(20).optional(),
  expiresAt: z.date().optional(),
  maxUses: z.number().int().positive().optional(),
});

export const createShareLink = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ ctx, input }): Promise<ShareLinkResponse> => {
    // Verify resource exists and user has access
    const resource = await getResource(input.resourceType, input.resourceId);
    if (!resource) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found" });
    }

    const hasAccess = await checkResourceAccess(
      ctx.session.user.id,
      input.resourceType,
      input.resourceId,
      "EDITOR"
    );
    if (!hasAccess) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }

    // Validate expiration date
    if (input.expiresAt && input.expiresAt <= new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Expiration date must be in the future",
      });
    }

    // Validate password for PASSWORD type
    if (input.type === "PASSWORD" && !input.password) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Password is required for PASSWORD type links",
      });
    }

    // Check share link limit
    const linkCount = await db
      .select({ count: sql`count(*)` })
      .from(shareLink)
      .where(and(
        eq(shareLink.resourceType, input.resourceType),
        eq(shareLink.resourceId, input.resourceId),
        eq(shareLink.isActive, true)
      ));

    const limit = getUserShareLinkLimit(ctx.session.user);
    if (linkCount[0].count >= limit) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Share link limit reached (${limit})`,
      });
    }

    // Generate unique token
    const token = generateShareToken();

    // Hash password if provided
    const passwordHash = input.password 
      ? await hash(input.password, 10)
      : undefined;

    // Create share link
    const [newShareLink] = await db
      .insert(shareLink)
      .values({
        id: `link_${nanoid()}`,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        token,
        type: input.type,
        role: input.role,
        label: input.label,
        passwordHash,
        requireEmail: input.requireEmail ?? false,
        allowedEmails: input.allowedEmails,
        allowedDomains: input.allowedDomains,
        expiresAt: input.expiresAt,
        maxUses: input.maxUses,
        createdBy: ctx.session.user.id,
      })
      .returning();

    const url = `${process.env.APP_URL}/share/${token}`;

    return { shareLink: newShareLink, url };
  });

function generateShareToken(): string {
  // Generate URL-safe random token
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
```

---

## React Integration

### Custom Hooks

```typescript
// apps/web/src/hooks/use-permissions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import type { ResourceType, PermissionRole } from "@/types/permission";

export function usePermissions({ 
  resourceType, 
  resourceId,
}: { 
  resourceType: ResourceType; 
  resourceId: string;
}) {
  return useQuery({
    queryKey: ["permissions", resourceType, resourceId],
    queryFn: () => trpc.permission.getAll.query({ resourceType, resourceId }),
    enabled: !!resourceType && !!resourceId,
  });
}

export function useCheckAccess({
  resourceType,
  resourceId,
  requiredRole,
  enabled = true,
}: {
  resourceType: ResourceType;
  resourceId: string;
  requiredRole?: PermissionRole;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["access", resourceType, resourceId, requiredRole],
    queryFn: () => trpc.permission.checkAccess.query({ 
      resourceType, 
      resourceId, 
      requiredRole 
    }),
    enabled: enabled && !!resourceType && !!resourceId,
  });
}

export function useGrantPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trpc.permission.grant.mutate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["permissions", variables.resourceType, variables.resourceId],
      });
    },
  });
}

export function useRevokePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trpc.permission.revoke.mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
    },
  });
}

export function useShareLinks({
  resourceType,
  resourceId,
}: {
  resourceType: ResourceType;
  resourceId: string;
}) {
  return useQuery({
    queryKey: ["shareLinks", resourceType, resourceId],
    queryFn: () => trpc.permission.getShareLinks.query({ resourceType, resourceId }),
    enabled: !!resourceType && !!resourceId,
  });
}

export function useCreateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trpc.permission.createShareLink.mutate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["shareLinks", variables.resourceType, variables.resourceId],
      });
    },
  });
}

export function useDeleteShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trpc.permission.deleteShareLink.mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareLinks"] });
    },
  });
}
```

### Permission Manager Component

```typescript
// apps/web/src/components/permission-manager.tsx
import { useState } from "react";
import { usePermissions, useGrantPermission, useRevokePermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Shield } from "lucide-react";
import type { ResourceType, PermissionRole } from "@/types/permission";

interface PermissionManagerProps {
  resourceType: ResourceType;
  resourceId: string;
}

const roleLabels: Record<PermissionRole, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  REVIEWER: "Reviewer",
  VIEWER: "Viewer",
};

const roleColors: Record<PermissionRole, string> = {
  OWNER: "bg-purple-500",
  EDITOR: "bg-blue-500",
  REVIEWER: "bg-green-500",
  VIEWER: "bg-gray-500",
};

export function PermissionManager({ resourceType, resourceId }: PermissionManagerProps) {
  const { data, isLoading } = usePermissions({ resourceType, resourceId });
  const grantPermission = useGrantPermission();
  const revokePermission = useRevokePermission();

  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<PermissionRole>("REVIEWER");

  const handleGrant = async () => {
    if (!email) return;

    // TODO: Look up user by email first
    await grantPermission.mutateAsync({
      resourceType,
      resourceId,
      userId: "user_from_email_lookup",
      role: selectedRole,
    });

    setEmail("");
  };

  const handleRevoke = async (permissionId: string) => {
    if (confirm("Remove this user's access?")) {
      await revokePermission.mutateAsync({ permissionId });
    }
  };

  if (isLoading) {
    return <div>Loading permissions...</div>;
  }

  const permissions = data?.permissions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as PermissionRole)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EDITOR">Editor</SelectItem>
            <SelectItem value="REVIEWER">Reviewer</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleGrant} disabled={!email || grantPermission.isPending}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Granted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {permissions.map((perm) => (
            <TableRow key={perm.id}>
              <TableCell className="font-medium">
                {perm.user.name ?? perm.user.email}
              </TableCell>
              <TableCell>
                <Badge className={roleColors[perm.role]}>
                  {roleLabels[perm.role]}
                </Badge>
              </TableCell>
              <TableCell>
                {perm.inheritedFrom ? (
                  <Badge variant="outline">Inherited</Badge>
                ) : (
                  <Badge variant="secondary">Direct</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {perm.grantor.name}
              </TableCell>
              <TableCell className="text-right">
                {perm.role !== "OWNER" && !perm.inheritedFrom && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(perm.id)}
                    disabled={revokePermission.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {permissions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>No collaborators yet</p>
        </div>
      )}
    </div>
  );
}
```

### Share Link Dialog Component

```typescript
// apps/web/src/components/share-link-dialog.tsx
import { useState } from "react";
import { useCreateShareLink } from "@/hooks/use-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Share2, Copy, Check } from "lucide-react";
import type { ResourceType } from "@/types/permission";

interface ShareLinkDialogProps {
  resourceType: ResourceType;
  resourceId: string;
}

export function ShareLinkDialog({ resourceType, resourceId }: ShareLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("REVIEWER");
  const [shareUrl, setShareUrl] = useState("");

  const createShareLink = useCreateShareLink();

  const handleCreate = async () => {
    const result = await createShareLink.mutateAsync({
      resourceType,
      resourceId,
      type: usePassword ? "PASSWORD" : "PUBLIC",
      role: role as any,
      password: usePassword ? password : undefined,
    });

    setShareUrl(result.url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          Create Share Link
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Share Link</DialogTitle>
          <DialogDescription>
            Anyone with this link can access this {resourceType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Permission Level</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">Viewer (view only)</SelectItem>
                <SelectItem value="REVIEWER">Reviewer (view + comment)</SelectItem>
                <SelectItem value="EDITOR">Editor (full access)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Password protect</Label>
            <Switch checked={usePassword} onCheckedChange={setUsePassword} />
          </div>

          {usePassword && (
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          )}

          {shareUrl ? (
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly />
                <Button onClick={handleCopy} variant="outline" size="icon">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={handleCreate} 
              disabled={createShareLink.isPending || (usePassword && !password)}
              className="w-full"
            >
              Generate Link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Testing Scenarios

### Test Structure

```
packages/api/tests/permission/
├── grant/
│   ├── grants-permission-successfully.test.ts
│   ├── updates-existing-permission.test.ts
│   ├── throws-resource-not-found.test.ts
│   ├── throws-user-not-found.test.ts
│   ├── throws-forbidden-no-access.test.ts
│   ├── throws-cannot-grant-owner.test.ts
│   └── throws-limit-reached.test.ts
├── revoke/
│   ├── revokes-permission.test.ts
│   ├── throws-permission-not-found.test.ts
│   └── throws-forbidden.test.ts
├── check-access/
│   ├── returns-direct-access.test.ts
│   ├── returns-inherited-access.test.ts
│   ├── returns-no-access.test.ts
│   └── returns-highest-role.test.ts
├── create-share-link/
│   ├── creates-public-link.test.ts
│   ├── creates-password-protected-link.test.ts
│   ├── creates-expiring-link.test.ts
│   ├── throws-resource-not-found.test.ts
│   ├── throws-forbidden.test.ts
│   ├── throws-invalid-expiration.test.ts
│   └── throws-limit-reached.test.ts
├── access-via-share-link/
│   ├── grants-access-with-valid-token.test.ts
│   ├── validates-password.test.ts
│   ├── increments-use-count.test.ts
│   ├── throws-link-expired.test.ts
│   ├── throws-max-uses-exceeded.test.ts
│   └── throws-invalid-token.test.ts
└── transfer-ownership/
    ├── transfers-ownership.test.ts
    ├── demotes-previous-owner.test.ts
    ├── throws-not-owner.test.ts
    └── throws-user-not-found.test.ts
```

### Example Test

```typescript
// packages/api/tests/permission/grant/grants-permission-successfully.test.ts
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectOnce, mockInsertReturning, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
  vi.restoreAllMocks();
  resetDbMocks();
});

it("grants permission to a user on a project", async () => {
  // Arrange
  const mockProject = {
    id: "proj_123",
    name: "Test Project",
    ownerId: "user_owner",
  };

  const mockTargetUser = {
    id: "user_target",
    email: "target@example.com",
  };

  const mockPermission = {
    id: "perm_456",
    resourceType: "project",
    resourceId: "proj_123",
    userId: "user_target",
    role: "REVIEWER",
    grantedBy: "user_owner",
  };

  // Mock project lookup
  mockSelectOnce([mockProject]);
  // Mock access check
  mockSelectOnce([{ permission: "OWNER" }]);
  // Mock target user lookup
  mockSelectOnce([mockTargetUser]);
  // Mock collaborator count
  mockSelectOnce([{ count: 2 }]);
  // Mock existing permission check
  mockSelectOnce([]);
  // Mock permission insert
  mockInsertReturning([mockPermission]);
  // Mock audit log insert
  mockInsertReturning([{ id: "audit_123" }]);

  const caller = createTestCaller({
    session: createTestSession({ userId: "user_owner" }),
  });

  // Act
  const result = await caller.permission.grant({
    resourceType: "project",
    resourceId: "proj_123",
    userId: "user_target",
    role: "REVIEWER",
  });

  // Assert
  expect(result.permission).toBeDefined();
  expect(result.permission.id).toBe("perm_456");
  expect(result.permission.role).toBe("REVIEWER");
  expect(result.permission.userId).toBe("user_target");
});
```

---

## Error Handling

### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `NOT_FOUND` | 404 | Resource, user, or permission not found |
| `FORBIDDEN` | 403 | Insufficient permissions or limit reached |
| `BAD_REQUEST` | 400 | Invalid input (role, password, expiration) |
| `CONFLICT` | 409 | Cannot revoke own OWNER permission |
| `UNAUTHORIZED` | 401 | Not authenticated or invalid share link |

### Error Examples

```typescript
// Resource not found
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Project not found",
});

// Cannot grant OWNER
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Cannot grant OWNER role. Use transfer ownership instead.",
});

// Collaborator limit
throw new TRPCError({
  code: "FORBIDDEN",
  message: "Collaborator limit reached (25). Upgrade to add more users.",
});

// Invalid share link
throw new TRPCError({
  code: "UNAUTHORIZED",
  message: "Invalid or expired share link",
});

// Wrong password
throw new TRPCError({
  code: "UNAUTHORIZED",
  message: "Incorrect password",
});

// Cannot revoke own ownership
throw new TRPCError({
  code: "CONFLICT",
  message: "Cannot revoke your own ownership. Transfer ownership first.",
});
```

---

## Related Documentation

- [Projects API](./03-projects) - Project-level permissions
- [Videos API](./04-videos) - Video-level permissions
- [Teams API](./08-teams) - Team-based permission management
- [Guest Access API](./20-guest-access) - External reviewer access
- [Audit & Compliance API](./18-audit-compliance) - Permission audit logs

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | TBD | Initial release with grant/revoke and basic share links |
| 1.1.0 | TBD | Added password-protected and expiring links |
| 1.2.0 | TBD | Permission inheritance and audit logs |
| 1.3.0 | TBD | Bulk operations and transfer ownership |
