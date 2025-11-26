---
title: Integrations API
description: Connect Koko with third-party services and tools
---

# 🔌 Integrations API

## Overview

The Integrations domain enables connecting Koko with external services like project management tools, cloud storage, communication platforms, and creative software. This allows teams to streamline their workflows and keep all their tools in sync.

---

## 📌 Quick Reference

### Post-Launch Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `integration.list` | Query | Yes | List available integrations |
| `integration.connect` | Mutation | Yes | Connect an integration |
| `integration.disconnect` | Mutation | Yes | Disconnect integration |
| `integration.getStatus` | Query | Yes | Get connection status |

### Growth Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `integration.sync` | Mutation | Yes | Trigger manual sync | High |
| `integration.configure` | Mutation | Yes | Update integration settings | High |
| `integration.getLogs` | Query | Yes | View sync logs | Medium |
| `integration.test` | Mutation | Yes | Test connection | Medium |
| `integration.importAssets` | Mutation | Yes | Import from cloud storage | Medium |

### Scale Endpoints
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `integration.createCustom` | Mutation | Yes | Create custom integration | High |
| `integration.mapFields` | Mutation | Yes | Custom field mapping | Medium |
| `integration.setTriggers` | Mutation | Yes | Automation triggers | Medium |
| `integration.getMetrics` | Query | Yes | Integration usage metrics | Low |

---

## 📦 Data Models

### Integration

```typescript
interface Integration {
  id: string;                      // Unique identifier
  teamId: string;                  // Owning team
  
  // Provider Info
  provider: IntegrationProvider;   // e.g., 'slack', 'asana'
  providerName: string;            // Display name
  providerIcon: string;            // Icon URL
  category: IntegrationCategory;
  
  // Connection
  status: ConnectionStatus;        // 'connected' | 'disconnected' | 'error'
  connectedBy: string;             // User who connected
  connectedAt: DateTime;
  
  // Configuration
  config: IntegrationConfig;       // Provider-specific settings
  scope: string[];                 // Granted permissions
  
  // Sync Status
  lastSyncAt?: DateTime;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  syncErrors?: string[];
  
  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}

type IntegrationProvider = 
  | 'slack'
  | 'asana'
  | 'monday'
  | 'jira'
  | 'notion'
  | 'trello'
  | 'dropbox'
  | 'google_drive'
  | 's3'
  | 'premiere'
  | 'aftereffects'
  | 'figma'
  | 'zapier'
  | 'custom';

type IntegrationCategory = 
  | 'communication'
  | 'project_management'
  | 'storage'
  | 'creative'
  | 'automation';

type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';

interface IntegrationConfig {
  // Common
  autoSync?: boolean;
  syncInterval?: number;           // Minutes
  
  // Slack
  channelId?: string;
  notifyOn?: ('comment' | 'approval' | 'upload')[];
  
  // Project Management
  projectMapping?: Record<string, string>;  // Koko project -> External project
  statusMapping?: Record<string, string>;
  
  // Storage
  syncFolder?: string;
  importOnUpload?: boolean;
  
  // Custom
  webhookUrl?: string;
  headers?: Record<string, string>;
}
```

### IntegrationLog

```typescript
interface IntegrationLog {
  id: string;
  integrationId: string;
  
  action: 'sync' | 'import' | 'export' | 'notify' | 'webhook';
  status: 'success' | 'failed' | 'partial';
  
  details: {
    itemsProcessed?: number;
    itemsFailed?: number;
    errors?: string[];
    duration?: number;           // Milliseconds
  };
  
  createdAt: DateTime;
}
```

### Drizzle Schema

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const integration = sqliteTable(
  "integration",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    
    provider: text("provider").notNull(),
    providerName: text("provider_name").notNull(),
    providerIcon: text("provider_icon"),
    category: text("category", { 
      enum: ["communication", "project_management", "storage", "creative", "automation"] 
    }).notNull(),
    
    status: text("status", { 
      enum: ["connected", "disconnected", "error", "pending"] 
    }).default("disconnected").notNull(),
    connectedBy: text("connected_by")
      .references(() => user.id),
    connectedAt: integer("connected_at", { mode: "timestamp_ms" }),
    
    config: text("config", { mode: "json" })
      .$type<IntegrationConfig>()
      .default({})
      .notNull(),
    scope: text("scope", { mode: "json" })
      .$type<string[]>()
      .default([])
      .notNull(),
    
    // OAuth tokens (encrypted)
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: integer("token_expires_at", { mode: "timestamp_ms" }),
    
    lastSyncAt: integer("last_sync_at", { mode: "timestamp_ms" }),
    lastSyncStatus: text("last_sync_status", { 
      enum: ["success", "partial", "failed"] 
    }),
    syncErrors: text("sync_errors", { mode: "json" }).$type<string[]>(),
    
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("integration_team_idx").on(table.teamId),
    index("integration_provider_idx").on(table.provider),
    index("integration_status_idx").on(table.status),
  ]
);

export const integrationLog = sqliteTable(
  "integration_log",
  {
    id: text("id").primaryKey(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => integration.id, { onDelete: "cascade" }),
    
    action: text("action", { 
      enum: ["sync", "import", "export", "notify", "webhook"] 
    }).notNull(),
    status: text("status", { 
      enum: ["success", "failed", "partial"] 
    }).notNull(),
    
    details: text("details", { mode: "json" })
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("integration_log_integration_idx").on(table.integrationId),
    index("integration_log_created_idx").on(table.createdAt),
  ]
);
```

---

## 🚀 Post-Launch Endpoints

### 1. integration.list

**Status:** 🔄 Post-Launch

**Purpose:** List available and connected integrations

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be team member

**Input Schema:**

```typescript
{
  teamId: z.string(),
  category: z.enum(['communication', 'project_management', 'storage', 'creative', 'automation']).optional(),
  status: z.enum(['connected', 'disconnected', 'all']).default('all'),
}
```

**Response Schema:**

```typescript
{
  integrations: Array<{
    provider: IntegrationProvider;
    providerName: string;
    providerIcon: string;
    category: IntegrationCategory;
    description: string;
    status: ConnectionStatus;
    connectedAt?: DateTime;
    features: string[];
  }>;
}
```

**Example Request:**

```typescript
const { integrations } = await trpc.integration.list.query({
  teamId: "team_123",
  category: "communication",
});
```

**Example Response:**

```json
{
  "integrations": [
    {
      "provider": "slack",
      "providerName": "Slack",
      "providerIcon": "https://cdn.example.com/icons/slack.svg",
      "category": "communication",
      "description": "Get notifications in Slack when videos are uploaded or commented on",
      "status": "connected",
      "connectedAt": "2025-01-10T09:00:00Z",
      "features": ["Comment notifications", "Upload alerts", "Approval requests"]
    },
    {
      "provider": "teams",
      "providerName": "Microsoft Teams",
      "providerIcon": "https://cdn.example.com/icons/teams.svg",
      "category": "communication",
      "description": "Send notifications to Microsoft Teams channels",
      "status": "disconnected",
      "features": ["Comment notifications", "Upload alerts"]
    }
  ]
}
```

---

### 2. integration.connect

**Status:** 🔄 Post-Launch

**Purpose:** Connect an integration via OAuth or API key

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be team admin

**Input Schema:**

```typescript
{
  teamId: z.string(),
  provider: z.enum(['slack', 'asana', 'monday', 'jira', 'notion', 'trello', 'dropbox', 'google_drive', 's3', 'figma', 'zapier']),
  // For OAuth providers
  authCode: z.string().optional(),
  redirectUri: z.string().url().optional(),
  // For API key providers
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  // Additional config
  config: z.record(z.unknown()).optional(),
}
```

**Response Schema:**

```typescript
{
  integration: Integration;
  // For OAuth - return auth URL if authCode not provided
  authUrl?: string;
}
```

**OAuth Flow Example:**

```typescript
// Step 1: Get OAuth URL
const { authUrl } = await trpc.integration.connect.mutate({
  teamId: "team_123",
  provider: "slack",
  redirectUri: "https://app.koko.com/integrations/callback",
});

// Step 2: Redirect user to authUrl
window.location.href = authUrl;

// Step 3: After OAuth callback, complete connection
const { integration } = await trpc.integration.connect.mutate({
  teamId: "team_123",
  provider: "slack",
  authCode: "oauth_code_from_callback",
  redirectUri: "https://app.koko.com/integrations/callback",
});
```

**API Key Example:**

```typescript
const { integration } = await trpc.integration.connect.mutate({
  teamId: "team_123",
  provider: "s3",
  config: {
    accessKeyId: "AKIA...",
    secretAccessKey: "...",
    bucket: "my-bucket",
    region: "us-east-1",
  },
});
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Not team admin
- `BAD_REQUEST` - Invalid credentials or config
- `CONFLICT` - Integration already connected

---

### 3. integration.disconnect

**Status:** 🔄 Post-Launch

**Purpose:** Disconnect an integration

**Type:** Mutation

**Auth Required:** Yes

**Permissions:** Must be team admin

**Input Schema:**

```typescript
{
  integrationId: z.string(),
  revokeAccess: z.boolean().default(true), // Revoke OAuth tokens
}
```

**Response Schema:**

```typescript
{
  success: boolean;
}
```

**Business Rules:**

1. Revokes OAuth tokens with provider (if supported)
2. Removes stored credentials
3. Keeps integration record (disconnected status)
4. Logs remain for audit purposes

---

### 4. integration.getStatus

**Status:** 🔄 Post-Launch

**Purpose:** Get detailed integration status

**Type:** Query

**Auth Required:** Yes

**Permissions:** Must be team member

**Input Schema:**

```typescript
{
  integrationId: z.string(),
}
```

**Response Schema:**

```typescript
{
  integration: Integration;
  health: {
    status: 'healthy' | 'degraded' | 'down';
    lastCheck: DateTime;
    issues?: string[];
  };
  usage: {
    syncsToday: number;
    apiCallsToday: number;
    lastSync?: DateTime;
  };
}
```

---

## 🔮 Growth Endpoints

### integration.sync

**Priority:** High  
**Purpose:** Trigger manual sync with external service  
**Complexity:** Medium

**Input:**

```typescript
{
  integrationId: z.string(),
  syncType: z.enum(['full', 'incremental']).default('incremental'),
  entities: z.array(z.enum(['projects', 'tasks', 'comments', 'files'])).optional(),
}
```

**Response:**

```typescript
{
  job: {
    id: string;
    status: 'queued' | 'running';
    estimatedTime: number;
  };
}
```

---

### integration.configure

**Priority:** High  
**Purpose:** Update integration settings  
**Complexity:** Simple

**Input:**

```typescript
{
  integrationId: z.string(),
  config: z.object({
    autoSync: z.boolean().optional(),
    syncInterval: z.number().min(5).max(1440).optional(),   // 5 min to 24 hours
    notifications: z.object({
      onComment: z.boolean(),
      onApproval: z.boolean(),
      onUpload: z.boolean(),
    }).optional(),
    projectMapping: z.record(z.string()).optional(),
  }),
}
```

---

### integration.getLogs

**Priority:** Medium  
**Purpose:** View integration sync logs  
**Complexity:** Simple

**Input:**

```typescript
{
  integrationId: z.string(),
  action: z.enum(['sync', 'import', 'export', 'notify', 'webhook']).optional(),
  status: z.enum(['success', 'failed', 'partial']).optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
}
```

**Response:**

```typescript
{
  logs: IntegrationLog[];
  nextCursor?: string;
}
```

---

### integration.test

**Priority:** Medium  
**Purpose:** Test integration connection  
**Complexity:** Simple

**Input:**

```typescript
{
  integrationId: z.string(),
}
```

**Response:**

```typescript
{
  success: boolean;
  latency: number;           // Milliseconds
  permissions: string[];     // Granted permissions
  errors?: string[];
}
```

---

### integration.importAssets

**Priority:** Medium  
**Purpose:** Import files from cloud storage  
**Complexity:** Complex

**Input:**

```typescript
{
  integrationId: z.string(),
  projectId: z.string(),
  folderId: z.string().optional(),
  files: z.array(z.object({
    externalPath: z.string(),
    title: z.string().optional(),
  })).min(1).max(50),
}
```

**Response:**

```typescript
{
  job: {
    id: string;
    totalFiles: number;
    status: 'queued';
  };
}
```

---

## 🎯 Scale Endpoints

### integration.createCustom

**Priority:** High  
**Purpose:** Create custom webhook integration  
**Complexity:** Complex

**Input:**

```typescript
{
  teamId: z.string(),
  name: z.string().max(100),
  description: z.string().max(500).optional(),
  webhookUrl: z.string().url(),
  events: z.array(z.enum([
    'video.created',
    'video.updated',
    'video.deleted',
    'comment.created',
    'comment.resolved',
    'approval.requested',
    'approval.completed',
  ])),
  headers: z.record(z.string()).optional(),
  secret: z.string().optional(),              // For webhook signature
}
```

**Response:**

```typescript
{
  integration: Integration;
  webhookSecret: string;       // Generated if not provided
}
```

**Webhook Payload:**

```json
{
  "event": "comment.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "comment": {
      "id": "comment_123",
      "videoId": "video_456",
      "content": "Great work on this scene!",
      "author": {
        "id": "user_789",
        "name": "John Doe"
      }
    }
  },
  "signature": "sha256=abc123..."
}
```

---

### integration.mapFields

**Priority:** Medium  
**Purpose:** Configure custom field mapping  
**Complexity:** Medium

**Input:**

```typescript
{
  integrationId: z.string(),
  entityType: z.enum(['project', 'video', 'comment']),
  mappings: z.array(z.object({
    kokoField: z.string(),
    externalField: z.string(),
    transform: z.enum(['none', 'uppercase', 'lowercase', 'date', 'custom']).default('none'),
    customTransform: z.string().optional(),   // JavaScript function as string
  })),
}
```

---

### integration.setTriggers

**Priority:** Medium  
**Purpose:** Configure automation triggers  
**Complexity:** Complex

**Input:**

```typescript
{
  integrationId: z.string(),
  triggers: z.array(z.object({
    event: z.enum(['video.created', 'comment.created', 'approval.completed']),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'contains', 'greater_than', 'less_than']),
      value: z.unknown(),
    })),
    action: z.object({
      type: z.enum(['create_task', 'send_notification', 'update_status', 'webhook']),
      config: z.record(z.unknown()),
    }),
  })),
}
```

---

## 🔗 Supported Integrations

### Communication

| Provider | Features | Auth Type |
|----------|----------|-----------|
| **Slack** | Notifications, sharing | OAuth 2.0 |
| **Microsoft Teams** | Notifications | OAuth 2.0 |
| **Discord** | Webhooks | Webhook URL |

### Project Management

| Provider | Features | Auth Type |
|----------|----------|-----------|
| **Asana** | Task sync, comments | OAuth 2.0 |
| **Monday.com** | Board sync | API Key |
| **Jira** | Issue linking | OAuth 2.0 |
| **Notion** | Page sync | OAuth 2.0 |
| **Trello** | Card sync | OAuth 2.0 |

### Cloud Storage

| Provider | Features | Auth Type |
|----------|----------|-----------|
| **Dropbox** | Import/export | OAuth 2.0 |
| **Google Drive** | Import/export | OAuth 2.0 |
| **AWS S3** | Import/export | API Key |
| **OneDrive** | Import/export | OAuth 2.0 |

### Creative Tools

| Provider | Features | Auth Type |
|----------|----------|-----------|
| **Adobe Premiere** | Panel extension | OAuth 2.0 |
| **After Effects** | Panel extension | OAuth 2.0 |
| **Figma** | Design import | OAuth 2.0 |

### Automation

| Provider | Features | Auth Type |
|----------|----------|-----------|
| **Zapier** | Custom workflows | OAuth 2.0 |
| **Make (Integromat)** | Custom workflows | API Key |
| **Custom Webhook** | Any service | Webhook |

---

## 🔐 Security

### OAuth Token Storage

- Tokens encrypted at rest (AES-256)
- Refresh tokens rotated automatically
- Scopes limited to minimum required
- Token revocation on disconnect

### Webhook Security

- Signature verification (HMAC-SHA256)
- Timestamp validation (5-minute window)
- IP allowlisting (optional)
- Rate limiting

### Permissions

| Action | Required Role |
|--------|---------------|
| View integrations | Team Member |
| Connect/disconnect | Team Admin |
| Configure | Team Admin |
| View logs | Team Admin |

---

## 🧪 Testing Scenarios

### Connection Testing
- [ ] OAuth flow complete
- [ ] API key validation
- [ ] Invalid credentials handling
- [ ] Token refresh on expiry
- [ ] Disconnect and revoke

### Sync Testing
- [ ] Manual sync trigger
- [ ] Auto sync scheduling
- [ ] Incremental sync
- [ ] Full sync
- [ ] Error recovery

### Webhook Testing
- [ ] Webhook delivery
- [ ] Signature verification
- [ ] Retry on failure
- [ ] Event filtering

---

## 📚 Related Documentation

- [Webhooks API](./12-webhooks) - Incoming webhooks
- [Teams API](./08-teams) - Team management
- [Notifications API](./10-notifications) - Notification settings

---

## 🔗 External Resources

- [OAuth 2.0 RFC](https://oauth.net/2/)
- [Slack API](https://api.slack.com/)
- [Asana API](https://developers.asana.com/)
- [Zapier Developer Platform](https://developer.zapier.com/)
