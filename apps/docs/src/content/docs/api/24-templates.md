---
title: Templates API
description: Create and manage reusable project and comment templates
---

# 📋 Templates API

## Overview

The Templates domain enables teams to create reusable structures for projects, folders, comments, and approval workflows. Templates help standardize processes and speed up project setup.

---

## 📌 Quick Reference

### Post-Launch Endpoints
| Endpoint | Type | Auth | Completed | Purpose |
|----------|------|------|-----------|---------|
| `template.create` | Mutation | Yes | Not Started | Create new template |
| `template.getAll` | Query | Yes | Not Started | List templates |
| `template.getById` | Query | Yes | Not Started | Get template details |
| `template.update` | Mutation | Yes | Not Started | Update template |
| `template.delete` | Mutation | Yes | Not Started | Delete template |
| `template.apply` | Mutation | Yes | Not Started | Apply template |

### Growth Endpoints
| Endpoint | Type | Auth | Completed | Purpose | Priority |
|----------|------|------|-----------|---------|----------|
| `template.duplicate` | Mutation | Yes | Not Started | Clone template | High |
| `template.createFromProject` | Mutation | Yes | Not Started | Create from existing project | High |
| `template.share` | Mutation | Yes | Not Started | Share with team | Medium |
| `template.getCategories` | Query | Yes | Not Started | List template categories | Low |

### Scale Endpoints
| Endpoint | Type | Auth | Completed | Purpose | Priority |
|----------|------|------|-----------|---------|----------|
| `template.setDefault` | Mutation | Yes | Not Started | Set team default template | Medium |
| `template.getUsage` | Query | Yes | Not Started | Template usage analytics | Low |
| `template.import` | Mutation | Yes | Not Started | Import from file | Low |
| `template.export` | Mutation | Yes | Not Started | Export to file | Low |

---

## 📦 Data Models

### Template

```typescript
interface Template {
  id: string;                      // Unique identifier
  ownerId: string;                 // Creator
  teamId?: string;                 // Team ownership
  
  // Metadata
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  
  // Type-specific
  type: TemplateType;
  config: TemplateConfig;
  
  // Settings
  visibility: TemplateVisibility;
  isDefault: boolean;              // Default for team
  
  // Stats
  usageCount: number;
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}

type TemplateType = 
  | 'project'           // Full project structure
  | 'folder'            // Folder hierarchy
  | 'comment'           // Comment presets
  | 'approval'          // Approval workflow
  | 'checklist';        // Review checklist

type TemplateVisibility = 'private' | 'team' | 'public';

type TemplateConfig = 
  | ProjectTemplateConfig
  | FolderTemplateConfig
  | CommentTemplateConfig
  | ApprovalTemplateConfig
  | ChecklistTemplateConfig;
```

### ProjectTemplateConfig

```typescript
interface ProjectTemplateConfig {
  type: 'project';
  
  // Project settings
  defaultSettings: {
    visibility?: 'private' | 'team';
    allowGuestAccess?: boolean;
    commentingEnabled?: boolean;
  };
  
  // Folder structure
  folders: Array<{
    name: string;
    description?: string;
    color?: string;
    children?: Array</* recursive */>;
  }>;
  
  // Default team members
  defaultMembers?: Array<{
    role: 'viewer' | 'commenter' | 'editor' | 'admin';
    // Can specify user IDs or "owner" placeholder
  }>;
  
  // Tags to auto-create
  tags?: string[];
  
  // Approval workflow template
  approvalWorkflowId?: string;
}
```

### FolderTemplateConfig

```typescript
interface FolderTemplateConfig {
  type: 'folder';
  
  folders: Array<{
    name: string;
    description?: string;
    color?: string;
    children?: Array</* recursive */>;
  }>;
}
```

### CommentTemplateConfig

```typescript
interface CommentTemplateConfig {
  type: 'comment';
  
  presets: Array<{
    name: string;                  // e.g., "Request revision"
    content: string;               // Comment text
    shortcut?: string;             // Keyboard shortcut
    category?: string;             // e.g., "Feedback", "Approval"
  }>;
}
```

### ApprovalTemplateConfig

```typescript
interface ApprovalTemplateConfig {
  type: 'approval';
  
  stages: Array<{
    name: string;
    description?: string;
    requiredApprovers: number;
    approverRoles?: string[];      // e.g., ['director', 'client']
    deadline?: number;             // Days from stage start
    autoAdvance?: boolean;
  }>;
  
  notifications: {
    onStageStart?: boolean;
    onApproval?: boolean;
    onRejection?: boolean;
    reminderDays?: number[];
  };
}
```

### ChecklistTemplateConfig

```typescript
interface ChecklistTemplateConfig {
  type: 'checklist';
  
  items: Array<{
    text: string;
    required: boolean;
    category?: string;
  }>;
}
```

### Drizzle Schema

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const template = sqliteTable(
  "template",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .references(() => team.id, { onDelete: "cascade" }),
    
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"),
    icon: text("icon"),
    
    type: text("type", { 
      enum: ["project", "folder", "comment", "approval", "checklist"] 
    }).notNull(),
    config: text("config", { mode: "json" })
      .$type<TemplateConfig>()
      .notNull(),
    
    visibility: text("visibility", { 
      enum: ["private", "team", "public"] 
    }).default("private").notNull(),
    isDefault: integer("is_default", { mode: "boolean" })
      .default(false)
      .notNull(),
    
    usageCount: integer("usage_count").default(0).notNull(),
    
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("template_owner_idx").on(table.ownerId),
    index("template_team_idx").on(table.teamId),
    index("template_type_idx").on(table.type),
    index("template_visibility_idx").on(table.visibility),
  ]
);
```

---

## 🚀 Post-Launch Endpoints

### 1. template.create

**Status:** 🔄 Post-Launch

**Purpose:** Create a new template

**Type:** Mutation

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  type: z.enum(['project', 'folder', 'comment', 'approval', 'checklist']),
  config: z.union([
    projectTemplateConfigSchema,
    folderTemplateConfigSchema,
    commentTemplateConfigSchema,
    approvalTemplateConfigSchema,
    checklistTemplateConfigSchema,
  ]),
  visibility: z.enum(['private', 'team', 'public']).default('private'),
  teamId: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  template: Template;
}
```

**Example - Project Template:**

```typescript
const { template } = await trpc.template.create.mutate({
  name: "Marketing Campaign",
  description: "Standard structure for marketing video projects",
  type: "project",
  visibility: "team",
  teamId: "team_123",
  config: {
    type: "project",
    defaultSettings: {
      visibility: "team",
      commentingEnabled: true,
    },
    folders: [
      {
        name: "Briefs",
        color: "#3B82F6",
        children: [
          { name: "Creative Brief" },
          { name: "Technical Specs" },
        ],
      },
      {
        name: "Drafts",
        color: "#F59E0B",
        children: [
          { name: "Round 1" },
          { name: "Round 2" },
          { name: "Final" },
        ],
      },
      {
        name: "Approved",
        color: "#10B981",
      },
    ],
    tags: ["marketing", "campaign"],
  },
});
```

**Example - Comment Template:**

```typescript
const { template } = await trpc.template.create.mutate({
  name: "Video Review Feedback",
  type: "comment",
  visibility: "team",
  config: {
    type: "comment",
    presets: [
      {
        name: "Approved",
        content: "✅ Approved! Great work on this.",
        shortcut: "Cmd+Shift+A",
        category: "Approval",
      },
      {
        name: "Needs Revision",
        content: "Please revise this section. Specifically:\n\n- ",
        shortcut: "Cmd+Shift+R",
        category: "Feedback",
      },
      {
        name: "Audio Issue",
        content: "There's an audio issue at this timestamp. Please check levels.",
        category: "Technical",
      },
    ],
  },
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `BAD_REQUEST` - Invalid config for template type
- `FORBIDDEN` - Cannot create team template without admin role

---

### 2. template.getAll

**Status:** 🔄 Post-Launch

**Purpose:** List available templates

**Type:** Query

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  type: z.enum(['project', 'folder', 'comment', 'approval', 'checklist']).optional(),
  visibility: z.enum(['private', 'team', 'public', 'all']).default('all'),
  teamId: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
}
```

**Response Schema:**

```typescript
{
  templates: Array<Template & {
    owner: { id: string; name: string; image?: string };
  }>;
  nextCursor?: string;
}
```

---

### 3. template.getById

**Status:** 🔄 Post-Launch

**Purpose:** Get template details

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
  template: Template & {
    owner: { id: string; name: string; image?: string };
    team?: { id: string; name: string };
  };
}
```

---

### 4. template.update

**Status:** 🔄 Post-Launch

**Purpose:** Update template

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be owner or team admin

**Input Schema:**

```typescript
{
  id: z.string(),
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  config: z.union([...]).optional(),
  visibility: z.enum(['private', 'team', 'public']).optional(),
}
```

---

### 5. template.delete

**Status:** 🔄 Post-Launch

**Purpose:** Delete template

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be owner or team admin

**Input Schema:**

```typescript
{
  id: z.string(),
}
```

---

### 6. template.apply

**Status:** 🔄 Post-Launch

**Purpose:** Apply template to create new resource

**Type:** Mutation

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  templateId: z.string(),
  // For project templates
  projectName: z.string().optional(),
  // For folder templates
  projectId: z.string().optional(),
  parentFolderId: z.string().optional(),
  // For approval templates
  videoId: z.string().optional(),
  // Customizations
  overrides: z.record(z.unknown()).optional(),
}
```

**Response Schema:**

```typescript
{
  // Varies by template type
  project?: Project;
  folders?: Folder[];
  approvalWorkflow?: ApprovalWorkflow;
}
```

**Example - Apply Project Template:**

```typescript
const { project } = await trpc.template.apply.mutate({
  templateId: "tpl_marketing_campaign",
  projectName: "Summer Campaign 2025",
});

// Creates project with:
// - Pre-configured folders (Briefs, Drafts, Approved)
// - Default tags (marketing, campaign)
// - Team visibility settings
```

**Example - Apply Folder Template:**

```typescript
const { folders } = await trpc.template.apply.mutate({
  templateId: "tpl_video_workflow",
  projectId: "project_123",
  parentFolderId: "folder_456",
});
```

---

## 🔮 Growth Endpoints

### template.duplicate

**Priority:** High  
**Purpose:** Clone a template  
**Complexity:** Simple

**Input:**

```typescript
{
  id: z.string(),
  name: z.string().optional(),        // Defaults to "Copy of {original}"
  visibility: z.enum(['private', 'team']).optional(),
}
```

---

### template.createFromProject

**Priority:** High  
**Purpose:** Create template from existing project  
**Complexity:** Medium

**Input:**

```typescript
{
  projectId: z.string(),
  name: z.string().max(100),
  description: z.string().optional(),
  include: z.object({
    folders: z.boolean().default(true),
    tags: z.boolean().default(true),
    settings: z.boolean().default(true),
    approvalWorkflow: z.boolean().default(false),
  }),
  visibility: z.enum(['private', 'team']).default('private'),
}
```

**Response:**

```typescript
{
  template: Template;
}
```

**Business Rules:**

1. Does not include actual videos/content
2. Preserves folder structure and names
3. Optionally includes project settings
4. User must be project owner/admin

---

### template.share

**Priority:** Medium  
**Purpose:** Share template with team or make public  
**Complexity:** Simple

**Input:**

```typescript
{
  id: z.string(),
  visibility: z.enum(['private', 'team', 'public']),
  teamId: z.string().optional(),       // Required for 'team' visibility
}
```

---

### template.getCategories

**Priority:** Low  
**Purpose:** List template categories  
**Complexity:** Simple

**Response:**

```typescript
{
  categories: Array<{
    name: string;
    count: number;
    icon?: string;
  }>;
}
```

---

## 🎯 Scale Endpoints

### template.setDefault

**Priority:** Medium  
**Purpose:** Set team default template  
**Complexity:** Simple

**Input:**

```typescript
{
  templateId: z.string(),
  teamId: z.string(),
  type: z.enum(['project', 'folder', 'comment', 'approval', 'checklist']),
}
```

**Business Rules:**

1. Only one default per type per team
2. Requires team admin permission
3. Automatically applied when creating new resources

---

### template.getUsage

**Priority:** Low  
**Purpose:** Template usage analytics  
**Complexity:** Medium

**Input:**

```typescript
{
  id: z.string(),
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }).optional(),
}
```

**Response:**

```typescript
{
  usage: {
    totalUses: number;
    uniqueUsers: number;
    usesByDay: Array<{ date: string; count: number }>;
    topUsers: Array<{ userId: string; name: string; count: number }>;
  };
}
```

---

### template.import

**Priority:** Low  
**Purpose:** Import template from JSON file  
**Complexity:** Medium

**Input:**

```typescript
{
  file: z.object({
    name: z.string(),
    content: z.string(),           // JSON string
  }),
  visibility: z.enum(['private', 'team']).default('private'),
}
```

---

### template.export

**Priority:** Low  
**Purpose:** Export template to JSON file  
**Complexity:** Simple

**Input:**

```typescript
{
  id: z.string(),
}
```

**Response:**

```typescript
{
  fileName: string;
  content: string;                   // JSON string
}
```

---

## 📋 Template Types

### Project Templates

Best for standardizing project setup across teams:

```
📁 Marketing Campaign Template
├── 📂 Briefs
│   ├── 📂 Creative Brief
│   └── 📂 Technical Specs
├── 📂 Drafts
│   ├── 📂 Round 1
│   ├── 📂 Round 2
│   └── 📂 Final
├── 📂 Approved
└── 📂 Archive

Settings:
- Team visibility
- Guest access enabled
- Default tags: marketing, campaign
```

### Comment Templates

Speed up feedback with preset responses:

| Preset | Content | Shortcut |
|--------|---------|----------|
| Approved | "✅ Approved! Great work." | Cmd+Shift+A |
| Needs Revision | "Please revise: \n- " | Cmd+Shift+R |
| Audio Issue | "Audio levels need adjustment" | - |
| Color Note | "Please check color grading" | - |

### Approval Templates

Standardize review workflows:

```
Stage 1: Internal Review
├── Requires: 2 approvers
├── Approvers: [Editor, Director]
└── Deadline: 2 days

Stage 2: Client Review  
├── Requires: 1 approver
├── Approvers: [Client]
└── Deadline: 5 days

Stage 3: Final Signoff
├── Requires: 1 approver
├── Approvers: [Director]
└── Auto-advance: Yes
```

### Checklist Templates

Review criteria before approval:

```
Video Delivery Checklist:
☐ Audio levels normalized (-14 LUFS)
☐ No clipping in audio
☐ Color grade applied consistently
☐ Lower thirds spelled correctly
☐ End card duration correct (5s)
☐ Export at correct resolution
☐ File naming convention followed
```

---

## 🧪 Testing Scenarios

### Post-Launch Testing
- [ ] Create project template
- [ ] Create comment template
- [ ] Create approval template
- [ ] Apply project template
- [ ] Apply folder template
- [ ] Update template config
- [ ] Delete template
- [ ] Access control

### Application Testing
- [ ] Apply creates correct folders
- [ ] Apply respects overrides
- [ ] Apply increments usage count
- [ ] Template defaults applied

### Sharing Testing
- [ ] Share with team
- [ ] Make public
- [ ] Duplicate template
- [ ] Import/export

---

## 📚 Related Documentation

- [Projects API](./03-projects) - Project creation
- [Folders API](./14-folders) - Folder management
- [Approvals API](./20-approvals) - Approval workflows
- [Comments API](./05-comments) - Comment presets

---

## 🔗 External Resources

- [Template Design Patterns](https://www.nngroup.com/articles/template-based-design/)
- [JSON Schema Validation](https://json-schema.org/)
