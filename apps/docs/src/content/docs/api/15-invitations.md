---
title: Invitations API
description: Complete API reference for team and project invitations
---

# 🎫 Invitations API

## Overview

The Invitations API manages team and project collaboration invites. Users can invite collaborators via email, who can then accept or decline invitations. This is separate from public sharing links (Permissions API).

## 🔄 Post-Launch Endpoints

### `invitation.send` - Send Invitation

Send an invitation to collaborate on a project or join a team.

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const sendInvitationSchema = z.object({
	// Target
	type: z.enum(["project", "team"]),
	targetId: z.string(), // Project ID or Team ID
	
	// Invitee
	email: z.string().email(),
	
	// Role
	role: z.enum(["viewer", "commenter", "editor", "admin"]),
	
	// Optional message
	message: z.string().max(500).optional(),
	
	// Expiration (default: 7 days)
	expiresInDays: z.number().min(1).max(30).default(7),
});
```

#### Output Schema

```typescript
interface SendInvitationOutput {
	invitation: {
		id: string;
		type: "project" | "team";
		targetId: string;
		targetName: string;
		email: string;
		role: string;
		status: "pending" | "accepted" | "declined" | "expired";
		expiresAt: Date;
		createdAt: Date;
		invitedBy: {
			id: string;
			name: string;
			email: string;
		};
	};
	
	// Email sent confirmation
	emailSent: boolean;
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

const invitation = await trpc.invitation.send.mutate({
	type: "project",
	targetId: "507f1f77bcf86cd799439011",
	email: "designer@example.com",
	role: "editor",
	message: "Welcome to the project! Looking forward to your feedback on the latest video.",
	expiresInDays: 7,
});

console.log(`Invitation sent to ${invitation.invitation.email}`);
```

#### Business Rules

1. **Quota Check** - Respects team member limits
2. **Duplicate Prevention** - Can't invite same email twice to same target
3. **Auto-Registration** - Creates user account on acceptance if needed
4. **Email Delivery** - Sends email with accept/decline links
5. **Expiration** - Default 7 days, max 30 days
6. **Permission Check** - Only admins/owners can invite

---

### `invitation.accept` - Accept Invitation

Accept a pending invitation.

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const acceptInvitationSchema = z.object({
	invitationId: z.string(),
	
	// Optional: if accepting from email link
	token: z.string().optional(),
});
```

#### Output Schema

```typescript
interface AcceptInvitationOutput {
	success: true;
	
	// Access granted
	membership: {
		id: string;
		type: "project" | "team";
		targetId: string;
		targetName: string;
		role: string;
		joinedAt: Date;
	};
	
	// Redirect URL
	redirectUrl: string; // e.g., "/projects/abc123"
}
```

#### Business Rules

1. **Quota Enforcement** - Checks team member limit before accepting
2. **Token Validation** - Email tokens expire with invitation
3. **Auto-Upgrade Prompt** - Shows upgrade if quota exceeded
4. **Duplicate Check** - Can't accept if already a member
5. **Status Update** - Marks invitation as "accepted"

---

### `invitation.decline` - Decline Invitation

Decline a pending invitation.

**Type:** Mutation  
**Auth:** Optional (can use token from email)

#### Input Schema

```typescript
const declineInvitationSchema = z.object({
	invitationId: z.string(),
	token: z.string().optional(),
	
	// Optional reason
	reason: z.string().max(500).optional(),
});
```

---

### `invitation.cancel` - Cancel Invitation

Cancel a pending invitation (inviter only).

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const cancelInvitationSchema = z.object({
	invitationId: z.string(),
});
```

---

### `invitation.listPending` - List Pending Invitations

Get all pending invitations (sent or received).

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const listPendingSchema = z.object({
	// Filter by direction
	filter: z.enum(["sent", "received", "all"]).default("all"),
	
	// Pagination
	limit: z.number().min(1).max(100).default(20),
	cursor: z.string().optional(),
});
```

#### Output Schema

```typescript
interface ListPendingOutput {
	invitations: {
		id: string;
		type: "project" | "team";
		targetId: string;
		targetName: string;
		email: string;
		role: string;
		status: "pending";
		expiresAt: Date;
		createdAt: Date;
		direction: "sent" | "received";
		invitedBy?: { id: string; name: string };
	}[];
	nextCursor?: string;
}
```

---

### `invitation.resend` - Resend Invitation Email

Resend the invitation email (rate limited).

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const resendInvitationSchema = z.object({
	invitationId: z.string(),
});
```

#### Business Rules

1. **Rate Limit** - Max 3 resends per invitation
2. **Status Check** - Only resend if still pending
3. **Email Throttle** - 1 hour minimum between resends

---

### 📋 `invitation.bulkInvite` - Bulk Invite (Growth Phase)

Invite multiple users at once (CSV upload).

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const bulkInviteSchema = z.object({
	type: z.enum(["project", "team"]),
	targetId: z.string(),
	
	// List of invitees
	invitees: z.array(
		z.object({
			email: z.string().email(),
			role: z.enum(["viewer", "commenter", "editor", "admin"]),
		})
	).min(1).max(100),
	
	message: z.string().max(500).optional(),
});
```

#### Output Schema

```typescript
interface BulkInviteOutput {
	total: number;
	successful: number;
	failed: number;
	
	results: {
		email: string;
		status: "sent" | "failed";
		reason?: string; // If failed
		invitationId?: string; // If sent
	}[];
}
```

---

## 📧 Email Templates

### Invitation Email

```
Subject: {InviterName} invited you to {ProjectName} on Koko

Hi there,

{InviterName} has invited you to collaborate on "{ProjectName}" as a {Role}.

{OptionalMessage}

Accept Invitation: {AcceptUrl}
Decline: {DeclineUrl}

This invitation expires in {DaysRemaining} days.

---
Koko - Video Collaboration Made Simple
```

### Reminder Email (3 days before expiry)

```
Subject: Reminder: Invitation to {ProjectName} expires soon

Hi there,

This is a friendly reminder that your invitation to "{ProjectName}" expires in 3 days.

Accept Invitation: {AcceptUrl}

---
Koko
```

---

## 🔗 Related APIs

- [Teams API](./08-teams) - Team management
- [Projects API](./03-projects) - Project collaboration
- [Permissions API](./09-permissions) - Access control
- [Quota API](./14-quota) - Team member limits

---

## 🛡️ Security Considerations

1. **Token Security** - Invitation tokens are single-use, time-limited
2. **Email Verification** - Verify email ownership before granting access
3. **Quota Enforcement** - Check team limits server-side
4. **Rate Limiting** - Prevent invitation spam
5. **Audit Trail** - Log all invitation actions

---

**Last Updated:** November 22, 2025  
**API Version:** 1.0.0 (Post-Launch)
