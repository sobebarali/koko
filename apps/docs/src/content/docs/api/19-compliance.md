---
title: Compliance & Security API
description: GDPR compliance, audit logging, data export, and enterprise security features
---

# Compliance & Security API

## Overview

The Compliance API enables organizations to meet regulatory requirements (GDPR, SOC2, HIPAA), maintain audit trails, and implement enterprise security controls. Critical for enterprise customers and regulated industries.

**Phase:** 🎯 Scale (Month 6+)  
**Endpoints:** 5  
**Priority:** High for enterprise, low for MVP

---

## Key Features

- **GDPR Compliance** - Data export, right to erasure
- **Audit Logging** - Comprehensive security audit trails
- **Data Retention** - Configurable retention policies
- **IP Whitelisting** - Network access controls
- **Compliance Reporting** - SOC2, HIPAA, ISO 27001 reports
- **Data Encryption** - At-rest and in-transit encryption

---

## Endpoints

### 1. Export User Data (GDPR)

Export all user data in machine-readable format (GDPR Article 20).

```typescript
compliance.exportData: protectedProcedure
  .input(
    z.object({
      userId: z.string().optional(), // If admin, can export other users
      format: z.enum(['json', 'csv']).default('json'),
      includeDeleted: z.boolean().default(false), // Include soft-deleted data
    })
  )
  .mutation()
```

#### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `string` | No | User ID to export (default: current user) |
| `format` | `enum` | No | Export format: `json` or `csv` (default: `json`) |
| `includeDeleted` | `boolean` | No | Include soft-deleted records (default: `false`) |

#### Response

```typescript
{
  exportId: string;                  // Export job ID
  userId: string;
  format: 'json' | 'csv';
  status: 'processing' | 'completed' | 'failed';
  
  // If completed
  downloadUrl?: string;              // Pre-signed S3 URL (expires in 24 hours)
  fileName?: string;                 // e.g., "user-data-export-2025-01-15.json"
  fileSize?: number;                 // Bytes
  expiresAt?: string;                // ISO DateTime
  
  createdAt: string;
  completedAt?: string;
  
  // Data included in export
  dataIncluded: {
    profile: boolean;
    projects: number;                // Count
    videos: number;
    comments: number;
    annotations: number;
    teamMemberships: number;
    billingHistory: number;
    auditLogs: number;
  };
}
```

#### Example

```typescript
// Request data export
const exportJob = await trpc.compliance.exportData.mutate({
  format: 'json',
  includeDeleted: true,
});

console.log(`Export started: ${exportJob.exportId}`);

// Poll for completion (or use WebSocket)
const checkExport = async () => {
  const status = await trpc.compliance.getExportStatus.query({
    exportId: exportJob.exportId,
  });
  
  if (status.status === 'completed') {
    window.open(status.downloadUrl, '_blank');
  } else if (status.status === 'processing') {
    setTimeout(checkExport, 5000); // Check again in 5s
  } else {
    console.error('Export failed');
  }
};

checkExport();
```

#### Exported Data Structure (JSON)

```json
{
  "exportedAt": "2025-01-15T10:30:00Z",
  "userId": "507f1f77bcf86cd799439011",
  "profile": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "createdAt": "2024-01-01T00:00:00Z",
    "emailVerified": true
  },
  "projects": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "My Project",
      "createdAt": "2024-02-15T10:00:00Z",
      "videos": [...],
      "members": [...]
    }
  ],
  "comments": [...],
  "annotations": [...],
  "billingHistory": [...],
  "auditLogs": [...]
}
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not allowed to export other users' data
- `NOT_FOUND` - User not found
- `TOO_MANY_REQUESTS` - Export limit exceeded (1 per day)

#### Notes

- **Processing time:** 5-30 minutes for large accounts
- **Retention:** Export files deleted after 7 days
- **Rate limit:** 1 export per user per 24 hours
- **Size limit:** Max 5GB export (compress large files)
- **Admin access:** Admins can export data for compliance audits

---

### 2. Delete User Data (GDPR Right to Erasure)

Permanently delete user account and all associated data (GDPR Article 17).

```typescript
compliance.deleteData: protectedProcedure
  .input(
    z.object({
      userId: z.string().optional(), // If admin, can delete other users
      reason: z.string().max(500).optional(),
      confirmationCode: z.string(), // Email verification code
      keepAuditTrail: z.boolean().default(true), // Anonymize vs hard delete
    })
  )
  .mutation()
```

#### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `string` | No | User ID to delete (default: current user) |
| `reason` | `string` | No | Reason for deletion (max 500 chars) |
| `confirmationCode` | `string` | Yes | Email verification code (sent separately) |
| `keepAuditTrail` | `boolean` | No | Anonymize instead of hard delete (default: `true`) |

#### Response

```typescript
{
  deletionId: string;                // Deletion job ID
  userId: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  scheduledFor: string;              // ISO DateTime (30-day grace period)
  
  deletionSummary: {
    profile: boolean;
    projects: number;                // Count to be deleted
    videos: number;
    comments: number;
    annotations: number;
    files: number;
    storageFreed: number;            // Bytes
  };
  
  // Anonymization details (if keepAuditTrail = true)
  anonymization: {
    auditLogsRetained: number;
    commentsAnonymized: number;      // "Deleted User" placeholder
    projectsTransferred: number;     // Transferred to team owner
  } | null;
  
  createdAt: string;
  completedAt?: string;
}
```

#### Example

```typescript
// Step 1: Request confirmation code
await trpc.auth.requestAccountDeletion.mutate({
  email: user.email,
});

// Step 2: User receives email with code

// Step 3: Confirm deletion
const deletion = await trpc.compliance.deleteData.mutate({
  confirmationCode: '123456',
  reason: 'No longer using the service',
  keepAuditTrail: true,
});

console.log(`Account deletion scheduled for: ${deletion.scheduledFor}`);
console.log(`Videos to be deleted: ${deletion.deletionSummary.videos}`);
console.log(`Storage to be freed: ${deletion.deletionSummary.storageFreed} bytes`);
```

#### Deletion Process

1. **Request deletion** → 30-day grace period starts
2. **Grace period** → User can cancel deletion (`compliance.cancelDeletion`)
3. **After 30 days** → Permanent deletion executed
4. **Anonymization** (if enabled):
   - User profile deleted
   - Comments/annotations marked as "Deleted User"
   - Projects transferred to team owner
   - Audit logs retained (anonymized)
5. **Hard deletion** (if disabled):
   - All data permanently removed
   - No audit trail retained

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not allowed to delete other users
- `BAD_REQUEST` - Invalid confirmation code
- `CONFLICT` - Active subscription (must cancel first)
- `PRECONDITION_FAILED` - Team owner with active members (must transfer ownership)

#### Notes

- **30-day grace period** - Users can cancel deletion during this time
- **Subscription required** - Must cancel paid subscriptions first
- **Team ownership** - Team owners must transfer ownership before deletion
- **Shared content** - Projects/videos shared with others are transferred, not deleted
- **Legal holds** - Cannot delete accounts under legal investigation

---

### 3. Get Audit Log

Retrieve comprehensive security and activity audit logs.

```typescript
compliance.auditLog: protectedProcedure
  .input(
    z.object({
      userId: z.string().optional(),           // Filter by user
      action: z.string().optional(),           // Filter by action type
      resourceType: z.enum([
        'user', 'project', 'video', 'comment', 'team', 'billing'
      ]).optional(),
      resourceId: z.string().optional(),
      
      dateRange: z.object({
        from: z.string(), // ISO date
        to: z.string(),
      }).optional(),
      
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      
      // Pagination
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
    })
  )
  .query()
```

#### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `string` | No | Filter by user ID |
| `action` | `string` | No | Action type (e.g., `"login"`, `"video.delete"`) |
| `resourceType` | `enum` | No | Resource type filter |
| `resourceId` | `string` | No | Specific resource ID |
| `dateRange` | `object` | No | Date range filter |
| `severity` | `enum` | No | Severity level filter |
| `page` | `number` | No | Page number (default: 1) |
| `pageSize` | `number` | No | Items per page (default: 50, max: 100) |

#### Response

```typescript
{
  logs: Array<{
    id: string;
    timestamp: string;                       // ISO DateTime
    
    // Actor (who performed action)
    userId: string | null;                   // null = system action
    userName: string | null;
    userEmail: string | null;
    userIp: string;                          // Anonymized last octet
    userAgent: string;
    
    // Action performed
    action: string;                          // e.g., "user.login", "video.delete"
    actionDescription: string;               // Human-readable
    severity: 'low' | 'medium' | 'high' | 'critical';
    
    // Resource affected
    resourceType: 'user' | 'project' | 'video' | 'comment' | 'team' | 'billing';
    resourceId: string | null;
    resourceName: string | null;
    
    // Additional context
    metadata: {
      previousValue?: unknown;               // Before change
      newValue?: unknown;                    // After change
      reason?: string;
      location?: string;                     // Country/region
      device?: string;                       // Device type
    };
    
    // Status
    success: boolean;
    errorMessage?: string;
    
    // Compliance
    retainUntil: string;                     // ISO DateTime (retention policy)
  }>;
  
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

#### Example

```typescript
// Get all high-severity events in last 30 days
const auditLogs = await trpc.compliance.auditLog.query({
  severity: 'high',
  dateRange: {
    from: '2024-12-15',
    to: '2025-01-15',
  },
  pageSize: 100,
});

auditLogs.logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.actionDescription}`);
  console.log(`  User: ${log.userName} (${log.userIp})`);
  console.log(`  Resource: ${log.resourceType}/${log.resourceId}`);
});

// Get all failed login attempts
const failedLogins = await trpc.compliance.auditLog.query({
  action: 'user.login',
  success: false,
  dateRange: {
    from: '2025-01-01',
    to: '2025-01-15',
  },
});
```

#### Logged Actions

**User Actions:**
- `user.login` / `user.logout` / `user.login.failed`
- `user.register` / `user.delete` / `user.update`
- `user.password.change` / `user.password.reset`
- `user.2fa.enable` / `user.2fa.disable`

**Project Actions:**
- `project.create` / `project.delete` / `project.update`
- `project.member.add` / `project.member.remove`
- `project.permission.change`

**Video Actions:**
- `video.upload` / `video.delete` / `video.update`
- `video.download` / `video.share` / `video.view`

**Team Actions:**
- `team.create` / `team.delete` / `team.update`
- `team.member.add` / `team.member.remove` / `team.member.role.change`

**Billing Actions:**
- `billing.subscription.create` / `billing.subscription.cancel`
- `billing.payment.success` / `billing.payment.failed`
- `billing.refund.request` / `billing.refund.complete`

**Security Actions:**
- `security.permission.denied`
- `security.ip.blocked`
- `security.suspicious.activity`

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not admin/owner (audit logs restricted)

#### Notes

- **Retention:** Audit logs retained for 7 years (compliance requirement)
- **Immutable:** Logs cannot be edited or deleted
- **Performance:** Large queries may be slow (use filters)
- **Privacy:** IP addresses anonymized (last octet masked)
- **Admin only:** Regular users cannot access audit logs

---

### 4. Download Compliance Report

Generate compliance report for SOC2, HIPAA, ISO 27001 audits.

```typescript
compliance.downloadReport: protectedProcedure
  .input(
    z.object({
      reportType: z.enum(['soc2', 'hipaa', 'iso27001', 'gdpr', 'custom']),
      dateRange: z.object({
        from: z.string(), // ISO date
        to: z.string(),
      }),
      format: z.enum(['pdf', 'csv']).default('pdf'),
      includeAuditLogs: z.boolean().default(true),
      includeUserData: z.boolean().default(false),
    })
  )
  .mutation()
```

#### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reportType` | `enum` | Yes | Compliance framework |
| `dateRange` | `object` | Yes | Reporting period |
| `format` | `enum` | No | Export format (default: `pdf`) |
| `includeAuditLogs` | `boolean` | No | Include audit log summary (default: `true`) |
| `includeUserData` | `boolean` | No | Include user data metrics (default: `false`) |

#### Response

```typescript
{
  reportId: string;
  reportType: 'soc2' | 'hipaa' | 'iso27001' | 'gdpr' | 'custom';
  status: 'processing' | 'completed' | 'failed';
  
  downloadUrl?: string;                // Pre-signed URL (expires in 24 hours)
  fileName?: string;
  fileSize?: number;
  expiresAt?: string;
  
  reportSummary: {
    totalUsers: number;
    totalProjects: number;
    totalVideos: number;
    storageUsed: number;                // Bytes
    auditLogEntries: number;
    securityIncidents: number;
    dataBreaches: number;                // Should be 0!
  };
  
  createdAt: string;
  createdBy: string;
  completedAt?: string;
}
```

#### Example

```typescript
// Generate SOC2 compliance report for Q4 2024
const report = await trpc.compliance.downloadReport.mutate({
  reportType: 'soc2',
  dateRange: {
    from: '2024-10-01',
    to: '2024-12-31',
  },
  format: 'pdf',
  includeAuditLogs: true,
});

console.log(`Report ID: ${report.reportId}`);
console.log(`Security incidents: ${report.reportSummary.securityIncidents}`);

// Poll for completion
const checkReport = async () => {
  const status = await trpc.compliance.getReportStatus.query({
    reportId: report.reportId,
  });
  
  if (status.status === 'completed') {
    window.open(status.downloadUrl, '_blank');
  }
};
```

#### Report Contents (SOC2 Example)

**SOC2 Trust Principles:**
1. **Security** - Access controls, encryption, incident response
2. **Availability** - Uptime, disaster recovery, backups
3. **Processing Integrity** - Data accuracy, error handling
4. **Confidentiality** - Data protection, encryption
5. **Privacy** - GDPR compliance, user consent

**Report Sections:**
- Executive Summary
- Audit period and scope
- Security controls implemented
- Access control policies
- Encryption standards (at-rest, in-transit)
- Incident response procedures
- Audit log summary
- Security incidents (if any)
- Compliance attestation

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not enterprise customer
- `BAD_REQUEST` - Invalid date range
- `PRECONDITION_FAILED` - Enterprise plan required

#### Notes

- **Enterprise only** - Compliance reports require Enterprise plan
- **Generation time:** 10-30 minutes for comprehensive reports
- **Attestation:** Reports signed by compliance officer
- **Validity:** Reports valid for 1 year from generation
- **Audit support:** Include in external audits (SOC2 Type II, etc.)

---

### 5. Manage IP Whitelist

Configure IP whitelisting for enterprise security.

```typescript
compliance.ipWhitelist: protectedProcedure
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'list', 'enable', 'disable']),
      
      // For add/remove
      ipAddress: z.string().optional(),      // CIDR notation: "192.168.1.0/24"
      description: z.string().max(200).optional(),
      
      // For enable/disable
      enabled: z.boolean().optional(),
    })
  )
  .mutation()
```

#### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `enum` | Yes | Action: `add`, `remove`, `list`, `enable`, `disable` |
| `ipAddress` | `string` | Conditional | CIDR notation (required for add/remove) |
| `description` | `string` | No | IP address description (max 200 chars) |
| `enabled` | `boolean` | Conditional | Enable/disable whitelist (required for enable/disable) |

#### Response

```typescript
{
  whitelistEnabled: boolean;
  ipAddresses: Array<{
    id: string;
    ipAddress: string;                       // CIDR notation
    description: string | null;
    addedBy: string;                         // User ID
    addedAt: string;                         // ISO DateTime
    lastUsed: string | null;                 // Last successful auth
  }>;
  totalIPs: number;
}
```

#### Example

```typescript
// Enable IP whitelist
await trpc.compliance.ipWhitelist.mutate({
  action: 'enable',
  enabled: true,
});

// Add company office IP range
await trpc.compliance.ipWhitelist.mutate({
  action: 'add',
  ipAddress: '203.0.113.0/24',
  description: 'Company Office - San Francisco',
});

// Add VPN IP
await trpc.compliance.ipWhitelist.mutate({
  action: 'add',
  ipAddress: '198.51.100.42/32',
  description: 'Corporate VPN',
});

// List all whitelisted IPs
const whitelist = await trpc.compliance.ipWhitelist.mutate({
  action: 'list',
});

console.log(`Whitelist enabled: ${whitelist.whitelistEnabled}`);
console.log(`Total IPs: ${whitelist.totalIPs}`);

// Remove IP
await trpc.compliance.ipWhitelist.mutate({
  action: 'remove',
  ipAddress: '203.0.113.0/24',
});
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not admin/owner
- `BAD_REQUEST` - Invalid IP address format
- `CONFLICT` - IP address already exists
- `PRECONDITION_FAILED` - Enterprise plan required

#### Notes

- **Enterprise only** - IP whitelisting requires Enterprise plan
- **CIDR notation** - Supports single IPs (`192.168.1.1/32`) or ranges (`192.168.1.0/24`)
- **Lockout prevention** - Cannot remove your own IP while connected
- **Bypass mechanism** - Emergency access via support (if locked out)
- **Audit logging** - All whitelist changes logged to audit trail
- **Performance** - Checked on every API request (cached in Redis)

---

## Common Compliance Patterns

### 1. GDPR Data Export Workflow

```typescript
// User requests data export
const exportJob = await trpc.compliance.exportData.mutate({
  format: 'json',
});

// Show loading state
const [exporting, setExporting] = useState(true);

// Poll for completion
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await trpc.compliance.getExportStatus.query({
      exportId: exportJob.exportId,
    });
    
    if (status.status === 'completed') {
      setExporting(false);
      // Trigger download
      window.location.href = status.downloadUrl;
      clearInterval(interval);
    }
  }, 5000);
  
  return () => clearInterval(interval);
}, [exportJob.exportId]);
```

### 2. Account Deletion with Grace Period

```typescript
// Step 1: Request deletion
const deletion = await trpc.compliance.deleteData.mutate({
  confirmationCode,
  reason: 'Moving to competitor',
  keepAuditTrail: true,
});

// Show countdown
const daysRemaining = Math.ceil(
  (new Date(deletion.scheduledFor).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
);

console.log(`Account will be deleted in ${daysRemaining} days`);

// Cancel deletion if user changes mind
const cancelDeletion = async () => {
  await trpc.compliance.cancelDeletion.mutate({
    deletionId: deletion.deletionId,
  });
};
```

### 3. Audit Log Monitoring

```typescript
// Monitor failed login attempts
const { data: failedLogins } = useQuery({
  queryKey: ['audit', 'failed-logins'],
  queryFn: () => trpc.compliance.auditLog.query({
    action: 'user.login',
    success: false,
    dateRange: {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24h
      to: new Date().toISOString(),
    },
  }),
  refetchInterval: 60000, // Refresh every minute
});

// Alert if suspicious activity detected
if (failedLogins && failedLogins.total > 10) {
  alert(`Warning: ${failedLogins.total} failed login attempts in last 24 hours`);
}
```

### 4. Generate Quarterly Compliance Report

```typescript
// Auto-generate report every quarter
const generateQuarterlyReport = async () => {
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterEnd = new Date(quarterStart);
  quarterEnd.setMonth(quarterEnd.getMonth() + 3);
  
  const report = await trpc.compliance.downloadReport.mutate({
    reportType: 'soc2',
    dateRange: {
      from: quarterStart.toISOString().split('T')[0],
      to: quarterEnd.toISOString().split('T')[0],
    },
    format: 'pdf',
    includeAuditLogs: true,
  });
  
  // Email to compliance team
  await trpc.email.send.mutate({
    to: 'compliance@example.com',
    subject: `Q${Math.floor(now.getMonth() / 3) + 1} SOC2 Compliance Report`,
    body: `Quarterly compliance report attached.`,
    attachments: [report.downloadUrl],
  });
};
```

---

## Data Retention Policies

### Default Retention Periods

| Data Type | Retention Period | Anonymization |
|-----------|------------------|---------------|
| User profile | Account lifetime | On deletion |
| Videos | Account lifetime | On deletion |
| Comments | Account lifetime | Anonymize to "Deleted User" |
| Audit logs | 7 years | IP anonymized |
| Billing records | 7 years | Required by law |
| Session logs | 90 days | IP anonymized |
| Uploaded files | Account lifetime | Permanent deletion |

### Custom Retention (Enterprise)

Enterprise customers can configure custom retention:

```typescript
// Set custom retention policy
await trpc.compliance.setRetentionPolicy.mutate({
  resourceType: 'auditLog',
  retentionDays: 2555, // 7 years
  autoDelete: true,
});
```

---

## Security Standards

### Encryption

- **At-rest:** AES-256 encryption for all stored data
- **In-transit:** TLS 1.3 for all API requests
- **Database:** SQLite/Turso encryption at rest
- **Files:** S3 server-side encryption (SSE-S3)
- **Bunny Stream:** Videos encrypted at rest and in-transit

### Access Controls

- **Role-based access control (RBAC)**
- **Multi-factor authentication (2FA)**
- **Session management** - 7-day expiry, HttpOnly cookies
- **IP whitelisting** - Enterprise feature
- **API key rotation** - Quarterly

### Compliance Certifications

**Planned:**
- SOC 2 Type II (in progress)
- GDPR compliant (by design)
- HIPAA compliance (future)
- ISO 27001 (future)

---

## Enterprise Features

### Single Sign-On (SSO)

```typescript
// Configure SAML SSO
await trpc.compliance.configureSaml.mutate({
  entityId: 'https://sso.company.com',
  ssoUrl: 'https://sso.company.com/login',
  certificate: '-----BEGIN CERTIFICATE-----...',
  enforceSSO: true, // Require SSO for all team members
});
```

### Data Residency

Enterprise customers can specify data storage region:

```typescript
await trpc.compliance.setDataResidency.mutate({
  region: 'eu-west-1', // Store data in EU
});
```

### Legal Holds

Prevent data deletion during legal proceedings:

```typescript
await trpc.compliance.legalHold.mutate({
  action: 'apply',
  userId: '507f1f77bcf86cd799439011',
  reason: 'Litigation hold - Case #12345',
  expiresAt: '2026-01-01T00:00:00Z',
});
```

---

## Future Enhancements

- **Real-time compliance dashboard** - Monitor compliance metrics
- **Automated compliance checks** - Continuous monitoring
- **Data loss prevention (DLP)** - Prevent sensitive data leaks
- **Compliance AI assistant** - Answer compliance questions
- **Third-party audit integration** - Direct auditor access
- **Blockchain audit trail** - Immutable audit logs (optional)

---

**Last Updated:** November 22, 2025  
**API Version:** 1.0.0 (Scale Phase)
