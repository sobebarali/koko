---
title: Approvals API
description: Review workflows, approval chains, and sign-off management for video deliverables
---

# ✅ Approvals API

## Overview

The Approvals domain enables formal review workflows for video deliverables. Stakeholders can approve, reject, or request changes on videos and versions, creating an auditable sign-off chain essential for professional video production.

---

## 📌 Quick Reference

### Post-Launch Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `approval.request` | Mutation | Yes | Create approval request |
| `approval.getAll` | Query | Yes | List approvals for video |
| `approval.getById` | Query | Yes | Get approval details |
| `approval.approve` | Mutation | Yes | Approve video/version |
| `approval.reject` | Mutation | Yes | Reject with feedback |
| `approval.requestChanges` | Mutation | Yes | Request revisions |

### Growth Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `approval.remind` | Mutation | Yes | Send reminder to approver | High |
| `approval.delegate` | Mutation | Yes | Delegate to another user | High |
| `approval.cancel` | Mutation | Yes | Cancel pending approval | Medium |
| `approval.getHistory` | Query | Yes | Full approval audit trail | Medium |
| `approval.bulkRequest` | Mutation | Yes | Request approval for multiple | Low |

### Scale Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `approval.createWorkflow` | Mutation | Yes | Create approval workflow template | High |
| `approval.setDeadline` | Mutation | Yes | Set approval deadline | Medium |
| `approval.autoApprove` | Mutation | Yes | Configure auto-approval rules | Low |
| `approval.escalate` | Mutation | Yes | Escalate overdue approval | Low |

---

## 📦 Data Models

### Approval

```typescript
interface Approval {
  id: string;                      // Unique identifier
  
  // Resource reference
  videoId: string;                 // Video being approved
  versionId?: string;              // Specific version (optional)
  
  // Request info
  requestedBy: string;             // User who requested approval
  requestedAt: DateTime;           // When requested
  message?: string;                // Message to approvers
  
  // Approver info
  approverId: string;              // User who should approve
  
  // Status
  status: ApprovalStatus;
  
  // Response (when completed)
  respondedAt?: DateTime;          // When responded
  responseMessage?: string;        // Feedback message
  
  // Workflow
  workflowId?: string;             // Part of workflow (optional)
  stepOrder?: number;              // Order in workflow chain
  
  // Deadline
  dueAt?: DateTime;                // Deadline for response
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}

enum ApprovalStatus {
  PENDING = "pending",             // Awaiting response
  APPROVED = "approved",           // Approved
  REJECTED = "rejected",           // Rejected
  CHANGES_REQUESTED = "changes_requested", // Needs revisions
  CANCELLED = "cancelled",         // Cancelled by requester
  EXPIRED = "expired"              // Deadline passed
}
```

### ApprovalWorkflow

```typescript
interface ApprovalWorkflow {
  id: string;
  name: string;                    // e.g., "Client Approval Flow"
  description?: string;
  projectId: string;               // Workflow belongs to project
  
  // Steps in order
  steps: ApprovalStep[];
  
  // Settings
  requireAllApprovers: boolean;    // All must approve vs. any one
  autoProgressOnApprove: boolean;  // Auto-move to next step
  
  createdBy: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface ApprovalStep {
  order: number;                   // Step order (1, 2, 3...)
  name: string;                    // e.g., "Creative Director Review"
  approverIds: string[];           // Users who can approve this step
  approverType: 'any' | 'all';     // Any one or all must approve
  deadlineDays?: number;           // Days to complete step
}
```

### Drizzle Schema

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const approval = sqliteTable(
  "approval",
  {
    id: text("id").primaryKey(),
    
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    versionId: text("version_id"),
    
    requestedBy: text("requested_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestedAt: integer("requested_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    message: text("message"),
    
    approverId: text("approver_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    status: text("status", { 
      enum: ["pending", "approved", "rejected", "changes_requested", "cancelled", "expired"] 
    })
      .default("pending")
      .notNull(),
    
    respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
    responseMessage: text("response_message"),
    
    workflowId: text("workflow_id"),
    stepOrder: integer("step_order"),
    
    dueAt: integer("due_at", { mode: "timestamp_ms" }),
    
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("approval_video_idx").on(table.videoId),
    index("approval_approver_idx").on(table.approverId),
    index("approval_requester_idx").on(table.requestedBy),
    index("approval_status_idx").on(table.status),
    index("approval_workflow_idx").on(table.workflowId),
  ]
);

export const approvalWorkflow = sqliteTable(
  "approval_workflow",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    
    steps: text("steps", { mode: "json" })
      .$type<ApprovalStep[]>()
      .notNull(),
    
    requireAllApprovers: integer("require_all_approvers", { mode: "boolean" })
      .default(false)
      .notNull(),
    autoProgressOnApprove: integer("auto_progress_on_approve", { mode: "boolean" })
      .default(true)
      .notNull(),
    
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("approval_workflow_project_idx").on(table.projectId),
  ]
);
```

---

## 🚀 Post-Launch Endpoints

### 1. approval.request

**Status:** 🔄 Post-Launch

**Purpose:** Request approval for a video or specific version

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be project owner or editor

**Input Schema:**

```typescript
{
  videoId: z.string(),
  versionId: z.string().optional(),
  
  // Approvers
  approverIds: z.array(z.string()).min(1).max(20),
  
  // Message
  message: z.string().max(2000).optional(),
  
  // Deadline
  dueAt: z.date().optional(),
  
  // Workflow (optional)
  workflowId: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  approvals: Array<Approval & {
    approver: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  }>;
}
```

**Example Request:**

```typescript
const { approvals } = await trpc.approval.request.mutate({
  videoId: "507f1f77bcf86cd799439012",
  approverIds: [
    "507f1f77bcf86cd799439020", // Creative Director
    "507f1f77bcf86cd799439021", // Client
  ],
  message: "Please review the final cut. Pay attention to the color grading in scene 3.",
  dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
});
```

**Example Response:**

```json
{
  "approvals": [
    {
      "id": "507f1f77bcf86cd799439100",
      "videoId": "507f1f77bcf86cd799439012",
      "status": "pending",
      "requestedAt": "2025-01-15T10:30:00Z",
      "dueAt": "2025-01-18T10:30:00Z",
      "approver": {
        "id": "507f1f77bcf86cd799439020",
        "name": "Sarah Chen",
        "email": "sarah@company.com"
      }
    },
    {
      "id": "507f1f77bcf86cd799439101",
      "videoId": "507f1f77bcf86cd799439012",
      "status": "pending",
      "requestedAt": "2025-01-15T10:30:00Z",
      "dueAt": "2025-01-18T10:30:00Z",
      "approver": {
        "id": "507f1f77bcf86cd799439021",
        "name": "John Client",
        "email": "john@client.com"
      }
    }
  ]
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not owner/editor of video
- `NOT_FOUND` - Video or approver not found
- `BAD_REQUEST` - Approver not in project, past deadline

**Business Rules:**

1. Approvers must be project members (or have guest access)
2. Cannot request approval from yourself
3. Deadline must be in the future
4. Creates one approval record per approver
5. Notifications sent to all approvers
6. Email notification includes link to video

**Side Effects:**

- Approval records created
- Email notifications sent to approvers
- In-app notifications created
- Activity logged

---

### 2. approval.getAll

**Status:** 🔄 Post-Launch

**Purpose:** List all approvals for a video

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must have view access to video

**Input Schema:**

```typescript
{
  videoId: z.string(),
  
  // Filtering
  status: z.enum(['pending', 'approved', 'rejected', 'changes_requested', 'cancelled', 'expired']).optional(),
  
  // Pagination
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  approvals: Array<Approval & {
    requester: { id: string; name: string; image?: string };
    approver: { id: string; name: string; image?: string };
  }>;
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    changesRequested: number;
  };
  nextCursor?: string;
}
```

---

### 3. approval.getById

**Status:** 🔄 Post-Launch

**Purpose:** Get detailed approval information

**Type:** Query

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

**Response Schema:**

```typescript
{
  approval: Approval & {
    requester: { id: string; name: string; email: string; image?: string };
    approver: { id: string; name: string; email: string; image?: string };
    video: {
      id: string;
      title: string;
      thumbnailUrl?: string;
    };
    version?: {
      id: string;
      number: number;
    };
  };
}
```

---

### 4. approval.approve

**Status:** 🔄 Post-Launch

**Purpose:** Approve a video/version

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be the designated approver

**Input Schema:**

```typescript
{
  id: z.string(),
  message: z.string().max(2000).optional(),
}
```

**Response Schema:**

```typescript
{
  approval: Approval;
  
  // If part of workflow, next step info
  nextStep?: {
    order: number;
    name: string;
    approvers: Array<{ id: string; name: string }>;
  };
  
  // If all approvals complete
  allApproved: boolean;
}
```

**Example Request:**

```typescript
const { approval, allApproved } = await trpc.approval.approve.mutate({
  id: "507f1f77bcf86cd799439100",
  message: "Looks great! The color grading is perfect now.",
});

if (allApproved) {
  console.log("Video is fully approved!");
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not the designated approver
- `NOT_FOUND` - Approval not found
- `CONFLICT` - Already responded to this approval

**Business Rules:**

1. Only designated approver can approve
2. Cannot approve twice (idempotent check)
3. Sets status to `approved`
4. If workflow, may trigger next step
5. Notification sent to requester

---

### 5. approval.reject

**Status:** 🔄 Post-Launch

**Purpose:** Reject a video/version

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be the designated approver

**Input Schema:**

```typescript
{
  id: z.string(),
  message: z.string().min(1).max(2000), // Reason required
}
```

**Response Schema:**

```typescript
{
  approval: Approval;
}
```

**Business Rules:**

1. Rejection reason is required
2. Sets status to `rejected`
3. Stops workflow progression
4. Notification sent to requester with reason

---

### 6. approval.requestChanges

**Status:** 🔄 Post-Launch

**Purpose:** Request revisions (softer than rejection)

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be the designated approver

**Input Schema:**

```typescript
{
  id: z.string(),
  message: z.string().min(1).max(2000), // Changes required
  
  // Link to specific comments (optional)
  commentIds: z.array(z.string()).optional(),
}
```

**Response Schema:**

```typescript
{
  approval: Approval;
}
```

**Business Rules:**

1. Sets status to `changes_requested`
2. Pauses workflow until changes made
3. Can link to specific comments for context
4. New version upload can reset approval

---

## 🔮 Growth Endpoints

### approval.remind

**Priority:** High  
**Purpose:** Send reminder to pending approver  
**Complexity:** Simple

**Input:**
```typescript
{
  id: z.string(),
  message: z.string().max(500).optional(),
}
```

**Business Rules:**
- Only requester can send reminder
- Rate limited: 1 reminder per 24 hours per approval
- Sends email and in-app notification

---

### approval.delegate

**Priority:** High  
**Purpose:** Delegate approval to another user  
**Complexity:** Medium

**Input:**
```typescript
{
  id: z.string(),
  delegateToId: z.string(),
  message: z.string().max(500).optional(),
}
```

**Business Rules:**
- Only current approver can delegate
- Delegate must be project member
- Original approver notified
- Audit trail maintained

---

### approval.cancel

**Priority:** Medium  
**Purpose:** Cancel pending approval request  
**Complexity:** Simple

**Input:**
```typescript
{
  id: z.string(),
}
```

**Business Rules:**
- Only requester can cancel
- Cannot cancel completed approvals
- Sets status to `cancelled`

---

### approval.getHistory

**Priority:** Medium  
**Purpose:** Full approval audit trail for a video  
**Complexity:** Simple

**Response:**
```typescript
{
  history: Array<{
    timestamp: DateTime;
    action: 'requested' | 'approved' | 'rejected' | 'changes_requested' | 'delegated' | 'reminded' | 'cancelled';
    actor: { id: string; name: string };
    details?: string;
  }>;
}
```

---

## 🎯 Scale Endpoints

### approval.createWorkflow

**Priority:** High  
**Purpose:** Create reusable approval workflow template  
**Complexity:** Medium

**Input:**
```typescript
{
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  projectId: z.string(),
  
  steps: z.array(z.object({
    name: z.string(),
    approverIds: z.array(z.string()).min(1),
    approverType: z.enum(['any', 'all']),
    deadlineDays: z.number().positive().optional(),
  })).min(1).max(10),
  
  autoProgressOnApprove: z.boolean().default(true),
}
```

**Example:**
```typescript
await trpc.approval.createWorkflow.mutate({
  name: "Client Approval Flow",
  projectId: "...",
  steps: [
    { name: "Internal Review", approverIds: ["..."], approverType: "any", deadlineDays: 2 },
    { name: "Creative Director", approverIds: ["..."], approverType: "all", deadlineDays: 3 },
    { name: "Client Sign-off", approverIds: ["..."], approverType: "all", deadlineDays: 5 },
  ],
});
```

---

### approval.setDeadline

**Priority:** Medium  
**Purpose:** Set or update approval deadline  
**Complexity:** Simple

**Input:**
```typescript
{
  id: z.string(),
  dueAt: z.date(),
}
```

---

### approval.escalate

**Priority:** Low  
**Purpose:** Escalate overdue approval to manager  
**Complexity:** Medium

**Input:**
```typescript
{
  id: z.string(),
  escalateTo: z.string(), // User ID
  message: z.string().max(500).optional(),
}
```

---

## 🔔 Notifications

### When Notifications are Sent

| Event | Recipients | Channel |
|-------|------------|---------|
| Approval requested | Approver | Email + In-app |
| Reminder sent | Approver | Email + In-app |
| Approved | Requester | Email + In-app |
| Rejected | Requester | Email + In-app |
| Changes requested | Requester | Email + In-app |
| Deadline approaching (24h) | Approver | Email + In-app |
| Deadline passed | Requester + Approver | Email |
| Delegated | New approver + Original | Email + In-app |

---

## 📊 Workflow States

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
┌─────────┐    ┌─────────┐    ┌───────────┐    ┌──────────┴───┐
│ PENDING │───▶│ APPROVED │    │  REJECTED  │    │   CHANGES    │
└─────────┘    └─────────┘    └───────────┘    │  REQUESTED   │
     │                              ▲          └──────────────┘
     │                              │                 │
     ├──────────────────────────────┤                 │
     │                                                │
     ▼                                                │
┌───────────┐                                         │
│ CANCELLED │                                         │
└───────────┘                                         │
     ▲                                                │
     │                                                │
┌────┴────┐                                           │
│ EXPIRED │◀──────────────────────────────────────────┘
└─────────┘     (new version can restart)
```

---

## 🧪 Testing Scenarios

### Post-Launch Testing
- [ ] Request approval from single user
- [ ] Request approval from multiple users
- [ ] Approve with message
- [ ] Reject with required message
- [ ] Request changes with linked comments
- [ ] Approve as non-approver (should fail)
- [ ] Get all approvals for video
- [ ] Filter by status

### Workflow Testing
- [ ] Create multi-step workflow
- [ ] Approval progresses to next step
- [ ] All-approvers-required step
- [ ] Deadline triggers expiration

---

## 📚 Related Documentation

- [Videos API](./04-videos) - Video resources
- [Versions API](./07-versions) - Version management
- [Comments API](./05-comments) - Link comments to approvals
- [Notifications API](./10-notifications) - Approval notifications

---

## 🔗 External Resources

- [Frame.io Approval Workflow](https://frame.io/) - Competitive reference
- [DAM Approval Best Practices](https://www.canto.com/blog/dam-approval-workflows/)
