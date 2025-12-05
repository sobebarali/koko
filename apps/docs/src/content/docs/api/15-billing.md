---
title: Billing & Subscriptions API
description: Complete API reference for billing, subscriptions, and payment management
---

# 💳 Billing & Subscriptions API

## Overview

The Billing API manages subscriptions, payments, and plan upgrades using **Polar.sh** as the payment provider. Koko uses a freemium model with tiered pricing based on storage, team size, and features.

## 🎯 MVP Endpoints

### `billing.getPlans` - List Available Plans

Get all available subscription plans and their features.

**Type:** Query  
**Auth:** No (public endpoint)

#### Input Schema

```typescript
// No input required
```

#### Output Schema

```typescript
interface Plan {
	id: string; // Plan identifier
	name: "free" | "pro" | "team" | "enterprise";
	displayName: string;
	description: string;
	price: {
		monthly: number; // Price in cents
		annual: number; // Price in cents (with discount)
		currency: "USD";
	};
	features: {
		// Projects
		projectsLimit: number | null; // null = unlimited
		
		// Videos
		videosLimit: number | null;
		storageLimit: number; // In bytes
		videoRetentionDays: number | null; // null = unlimited
		
		// Team
		teamMembersLimit: number;
		guestAccessLimit: number;
		
		// Features
		basicComments: boolean;
		advancedComments: boolean;
		annotations: boolean;
		versionControl: boolean;
		customBranding: boolean;
		watermarkRemoval: boolean;
		prioritySupport: boolean;
		advancedAnalytics: boolean;
		sso: boolean;
		apiAccess: boolean;
		whiteLabeling: boolean;
		sla: boolean;
	};
	limits: {
		// Rate limits
		uploadsPerHour: number;
		apiCallsPerHour: number;
	};
	popular: boolean; // Badge for recommended plan
	availableFor: "individual" | "team" | "enterprise";
}

interface GetPlansOutput {
	plans: Plan[];
	currentPlan?: string; // If user is authenticated
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

// Get all available plans
const { plans, currentPlan } = await trpc.billing.getPlans.query();

// Display pricing table
plans.forEach((plan) => {
	console.log(`${plan.displayName}: $${plan.price.monthly / 100}/month`);
	console.log(`Features: ${plan.features.videosLimit} videos, ${plan.features.teamMembersLimit} members`);
});
```

#### Response Example

```json
{
	"plans": [
		{
			"id": "plan_free",
			"name": "free",
			"displayName": "Free",
			"description": "Perfect for trying out Koko",
			"price": {
				"monthly": 0,
				"annual": 0,
				"currency": "USD"
			},
			"features": {
				"projectsLimit": 2,
				"videosLimit": 5,
				"storageLimit": 10737418240,
				"videoRetentionDays": 7,
				"teamMembersLimit": 2,
				"guestAccessLimit": 5,
				"basicComments": true,
				"advancedComments": false,
				"annotations": false,
				"versionControl": false,
				"customBranding": false,
				"watermarkRemoval": false,
				"prioritySupport": false,
				"advancedAnalytics": false,
				"sso": false,
				"apiAccess": false,
				"whiteLabeling": false,
				"sla": false
			},
			"limits": {
				"uploadsPerHour": 5,
				"apiCallsPerHour": 100
			},
			"popular": false,
			"availableFor": "individual"
		},
		{
			"id": "plan_pro",
			"name": "pro",
			"displayName": "Pro",
			"description": "For professional creators and small teams",
			"price": {
				"monthly": 2900,
				"annual": 25200,
				"currency": "USD"
			},
			"features": {
				"projectsLimit": null,
				"videosLimit": 50,
				"storageLimit": 107374182400,
				"videoRetentionDays": 90,
				"teamMembersLimit": 10,
				"guestAccessLimit": 50,
				"basicComments": true,
				"advancedComments": true,
				"annotations": true,
				"versionControl": true,
				"customBranding": true,
				"watermarkRemoval": true,
				"prioritySupport": false,
				"advancedAnalytics": true,
				"sso": false,
				"apiAccess": false,
				"whiteLabeling": false,
				"sla": false
			},
			"limits": {
				"uploadsPerHour": 20,
				"apiCallsPerHour": 1000
			},
			"popular": true,
			"availableFor": "individual"
		},
		{
			"id": "plan_team",
			"name": "team",
			"displayName": "Team",
			"description": "For growing teams with advanced needs",
			"price": {
				"monthly": 9900,
				"annual": 79200,
				"currency": "USD"
			},
			"features": {
				"projectsLimit": null,
				"videosLimit": 200,
				"storageLimit": 536870912000,
				"videoRetentionDays": null,
				"teamMembersLimit": 50,
				"guestAccessLimit": 200,
				"basicComments": true,
				"advancedComments": true,
				"annotations": true,
				"versionControl": true,
				"customBranding": true,
				"watermarkRemoval": true,
				"prioritySupport": true,
				"advancedAnalytics": true,
				"sso": false,
				"apiAccess": true,
				"whiteLabeling": false,
				"sla": false
			},
			"limits": {
				"uploadsPerHour": 100,
				"apiCallsPerHour": 5000
			},
			"popular": false,
			"availableFor": "team"
		}
	],
	"currentPlan": "plan_free"
}
```

#### Business Rules

1. **Free Plan Always Available** - Never hide the free tier
2. **Annual Discount** - 20% discount for annual billing
3. **Feature Gating** - Disabled features return errors when accessed
4. **Soft Limits** - Warning at 80% usage, hard block at 100%
5. **Grandfathering** - Existing users keep pricing if plans change

#### Error Codes

```typescript
// N/A - Public endpoint with no authentication required
```

---

### `billing.getCurrentPlan` - Get Current Subscription

Get the authenticated user's current subscription details.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
// No input required
```

#### Output Schema

```typescript
interface Subscription {
	id: string; // Subscription ID
	userId: string;
	
	// Plan details
	plan: {
		id: string;
		name: "free" | "pro" | "team" | "enterprise";
		displayName: string;
	};
	
	// Billing cycle
	billingCycle: "monthly" | "annual";
	status: "active" | "canceled" | "past_due" | "trialing" | "paused";
	
	// Dates
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	cancelAt?: Date; // If scheduled for cancellation
	canceledAt?: Date;
	trialEnd?: Date;
	
	// Payment
	amount: number; // In cents
	currency: "USD";
	nextBillingDate?: Date;
	
	// Polar.sh details
	polarSubscriptionId?: string;
	polarCustomerId?: string;
	
	// Payment method
	paymentMethod?: {
		type: "card";
		last4: string;
		brand: string; // "visa", "mastercard", etc.
		expiryMonth: number;
		expiryYear: number;
	};
	
	// Add-ons
	addOns: {
		extraSeats?: number;
		extraStorage?: number; // In bytes
	};
}

interface GetCurrentPlanOutput {
	subscription: Subscription;
	usage: {
		projects: { used: number; limit: number | null };
		videos: { used: number; limit: number | null };
		storage: { used: number; limit: number };
		teamMembers: { used: number; limit: number };
	};
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

const { subscription, usage } = await trpc.billing.getCurrentPlan.query();

console.log(`Current plan: ${subscription.plan.displayName}`);
console.log(`Status: ${subscription.status}`);
console.log(`Next billing: ${subscription.nextBillingDate}`);
console.log(`Storage used: ${usage.storage.used / usage.storage.limit * 100}%`);
```

#### Response Example

```json
{
	"subscription": {
		"id": "sub_507f1f77bcf86cd799439011",
		"userId": "507f1f77bcf86cd799439012",
		"plan": {
			"id": "plan_pro",
			"name": "pro",
			"displayName": "Pro"
		},
		"billingCycle": "monthly",
		"status": "active",
		"currentPeriodStart": "2025-01-15T00:00:00Z",
		"currentPeriodEnd": "2025-02-15T00:00:00Z",
		"amount": 2900,
		"currency": "USD",
		"nextBillingDate": "2025-02-15T00:00:00Z",
		"polarSubscriptionId": "polar_sub_abc123",
		"polarCustomerId": "polar_cus_xyz789",
		"paymentMethod": {
			"type": "card",
			"last4": "4242",
			"brand": "visa",
			"expiryMonth": 12,
			"expiryYear": 2027
		},
		"addOns": {}
	},
	"usage": {
		"projects": { "used": 5, "limit": null },
		"videos": { "used": 23, "limit": 50 },
		"storage": { "used": 45000000000, "limit": 107374182400 },
		"teamMembers": { "used": 3, "limit": 10 }
	}
}
```

#### Business Rules

1. **Free Tier Default** - New users start on free plan
2. **Grace Period** - 7 days grace period for past_due status
3. **Downgrade Protection** - Can't downgrade mid-billing cycle
4. **Usage Tracking** - Real-time usage calculations
5. **Prorated Billing** - Upgrades are prorated immediately

#### Error Codes

```typescript
throw new TRPCError({
	code: "UNAUTHORIZED",
	message: "You must be logged in to view subscription details",
});

throw new TRPCError({
	code: "NOT_FOUND",
	message: "No active subscription found",
});
```

---

### `billing.subscribe` - Subscribe to Plan

Create a new subscription or upgrade/downgrade existing plan.

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const subscribeSchema = z.object({
	planId: z.string(), // Plan identifier (e.g., "plan_pro")
	billingCycle: z.enum(["monthly", "annual"]),
	
	// Optional promo code
	promoCode: z.string().optional(),
	
	// Payment method (for new subscriptions)
	paymentMethodId: z.string().optional(), // Polar payment method ID
	
	// Success/cancel URLs for Polar checkout
	successUrl: z.string().url().optional(),
	cancelUrl: z.string().url().optional(),
});
```

#### Output Schema

```typescript
interface SubscribeOutput {
	// If immediate success (upgrade/downgrade)
	subscription?: Subscription;
	
	// If checkout required (new subscription)
	checkoutUrl?: string; // Polar.sh checkout URL
	checkoutId?: string;
	
	// Proration details (for upgrades)
	proration?: {
		amountDue: number; // Immediate charge in cents
		creditApplied: number; // From unused time on old plan
		nextBillingAmount: number; // Full amount for next cycle
	};
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

// New subscription (requires checkout)
const result = await trpc.billing.subscribe.mutate({
	planId: "plan_pro",
	billingCycle: "monthly",
	successUrl: "https://artellio.com/billing/success",
	cancelUrl: "https://artellio.com/billing/canceled",
});

if (result.checkoutUrl) {
	// Redirect to Polar.sh checkout
	window.location.href = result.checkoutUrl;
}

// Upgrade existing subscription (immediate)
const upgrade = await trpc.billing.subscribe.mutate({
	planId: "plan_team",
	billingCycle: "annual",
});

console.log(`Upgraded! Amount due: $${upgrade.proration.amountDue / 100}`);
```

#### Response Example (New Subscription)

```json
{
	"checkoutUrl": "https://polar.sh/checkout/abc123",
	"checkoutId": "polar_checkout_abc123"
}
```

#### Response Example (Upgrade)

```json
{
	"subscription": {
		"id": "sub_507f1f77bcf86cd799439011",
		"plan": {
			"id": "plan_team",
			"name": "team",
			"displayName": "Team"
		},
		"status": "active",
		"amount": 9900
	},
	"proration": {
		"amountDue": 7200,
		"creditApplied": 1500,
		"nextBillingAmount": 9900
	}
}
```

#### Business Rules

1. **Immediate Upgrades** - Upgrades take effect immediately
2. **Prorated Charges** - Unused time credited toward new plan
3. **Downgrade Delay** - Downgrades take effect at period end
4. **Feature Access** - New features available immediately on upgrade
5. **Payment Required** - Can't upgrade to paid plan without payment method
6. **Free → Paid** - Requires Polar checkout flow
7. **Paid → Paid** - Can upgrade/downgrade directly

#### Polar.sh Integration

```typescript
// Server-side (packages/api/src/routers/billing.ts)
import { polar } from "@artellio/auth"; // Polar client from packages/auth

export const billingRouter = router({
	subscribe: protectedProcedure
		.input(subscribeSchema)
		.mutation(async ({ ctx, input }) => {
			const user = ctx.session.user;
			const currentSub = await ctx.db.subscription.findUnique({
				where: { userId: user.id },
			});
			
			// If no current subscription, create Polar checkout
			if (!currentSub || currentSub.plan.name === "free") {
				const checkout = await polar.checkouts.create({
					productPriceId: input.planId,
					successUrl: input.successUrl,
					cancelUrl: input.cancelUrl,
					customerEmail: user.email,
				});
				
				return {
					checkoutUrl: checkout.url,
					checkoutId: checkout.id,
				};
			}
			
			// If upgrading/downgrading, use Polar subscriptions API
			const updatedSub = await polar.subscriptions.update({
				id: currentSub.polarSubscriptionId,
				priceId: input.planId,
				prorate: true,
			});
			
			// Update local database
			await ctx.db.subscription.update({
				where: { id: currentSub.id },
				data: {
					planId: input.planId,
					polarSubscriptionId: updatedSub.id,
					// ... other fields
				},
			});
			
			return { subscription: updatedSub };
		}),
});
```

#### Error Codes

```typescript
throw new TRPCError({
	code: "BAD_REQUEST",
	message: "Invalid plan ID",
});

throw new TRPCError({
	code: "BAD_REQUEST",
	message: "You are already subscribed to this plan",
});

throw new TRPCError({
	code: "PRECONDITION_FAILED",
	message: "Cannot downgrade: current usage exceeds new plan limits",
	data: {
		currentUsage: { videos: 75, storage: 150000000000 },
		newLimits: { videos: 50, storage: 107374182400 },
	},
});

throw new TRPCError({
	code: "PAYMENT_REQUIRED",
	message: "Payment method required for paid plans",
});

throw new TRPCError({
	code: "BAD_REQUEST",
	message: "Invalid promo code",
});
```

---

### `billing.cancelSubscription` - Cancel Subscription

Cancel the current subscription (takes effect at period end).

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const cancelSubscriptionSchema = z.object({
	// Optional cancellation reason
	reason: z.enum([
		"too_expensive",
		"missing_features",
		"switching_competitor",
		"no_longer_needed",
		"technical_issues",
		"other",
	]).optional(),
	
	// Optional feedback
	feedback: z.string().max(1000).optional(),
	
	// Immediate cancellation (loses remaining time)
	immediate: z.boolean().default(false),
});
```

#### Output Schema

```typescript
interface CancelSubscriptionOutput {
	subscription: Subscription;
	cancelAt: Date; // When cancellation takes effect
	accessUntil: Date; // Last day of access
	refund?: {
		amount: number; // In cents
		reason: string;
	};
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

// Cancel at period end (keep access until then)
const result = await trpc.billing.cancelSubscription.mutate({
	reason: "too_expensive",
	feedback: "Great product, but can't justify the cost right now",
	immediate: false,
});

console.log(`Subscription canceled. Access until: ${result.accessUntil}`);

// Immediate cancellation
const immediate = await trpc.billing.cancelSubscription.mutate({
	immediate: true,
});
```

#### Response Example

```json
{
	"subscription": {
		"id": "sub_507f1f77bcf86cd799439011",
		"status": "canceled",
		"cancelAt": "2025-02-15T00:00:00Z",
		"canceledAt": "2025-01-20T15:30:00Z"
	},
	"cancelAt": "2025-02-15T00:00:00Z",
	"accessUntil": "2025-02-14T23:59:59Z"
}
```

#### Business Rules

1. **Period End Default** - Cancellation takes effect at period end
2. **Keep Access** - User retains access until cancelAt date
3. **No Refunds** - No refunds for early cancellation (by default)
4. **Immediate Option** - Loses remaining time, no refund
5. **Downgrade to Free** - User moves to free tier after cancellation
6. **Reactivation Window** - Can reactivate before cancelAt date
7. **Feedback Collection** - Store cancellation reasons for analytics

#### Polar.sh Integration

```typescript
// Cancel subscription via Polar API
const canceled = await polar.subscriptions.cancel({
	id: subscription.polarSubscriptionId,
	cancelAtPeriodEnd: !input.immediate,
});

// Log cancellation reason
await ctx.db.cancellationFeedback.create({
	data: {
		userId: user.id,
		subscriptionId: subscription.id,
		reason: input.reason,
		feedback: input.feedback,
		canceledAt: new Date(),
	},
});
```

#### Error Codes

```typescript
throw new TRPCError({
	code: "BAD_REQUEST",
	message: "You are on the free plan and cannot cancel",
});

throw new TRPCError({
	code: "BAD_REQUEST",
	message: "Subscription is already canceled",
});

throw new TRPCError({
	code: "CONFLICT",
	message: "Subscription has pending payments. Please resolve before canceling.",
});
```

---

### `billing.updatePaymentMethod` - Update Payment Method

Update the credit card or payment method for the subscription.

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const updatePaymentMethodSchema = z.object({
	paymentMethodId: z.string(), // Polar payment method ID
});
```

#### Output Schema

```typescript
interface UpdatePaymentMethodOutput {
	paymentMethod: {
		type: "card";
		last4: string;
		brand: string;
		expiryMonth: number;
		expiryYear: number;
	};
	updatedAt: Date;
}
```

#### Usage Example

```typescript
import { trpc } from "@/lib/trpc";

// After collecting card details via Polar.js on frontend
const paymentMethodId = "polar_pm_abc123";

const result = await trpc.billing.updatePaymentMethod.mutate({
	paymentMethodId,
});

console.log(`Payment method updated: ${result.paymentMethod.brand} ending in ${result.paymentMethod.last4}`);
```

#### Response Example

```json
{
	"paymentMethod": {
		"type": "card",
		"last4": "4242",
		"brand": "visa",
		"expiryMonth": 12,
		"expiryYear": 2027
	},
	"updatedAt": "2025-01-20T15:30:00Z"
}
```

#### Frontend Integration (Polar.js)

```typescript
// Frontend payment form
import { loadPolar } from "@polar-sh/react";

const polar = loadPolar(process.env.POLAR_PUBLIC_KEY);

// Create payment method
const { paymentMethod } = await polar.createPaymentMethod({
	type: "card",
	card: {
		number: "4242424242424242",
		expMonth: 12,
		expYear: 2027,
		cvc: "123",
	},
});

// Send to backend
await trpc.billing.updatePaymentMethod.mutate({
	paymentMethodId: paymentMethod.id,
});
```

#### Business Rules

1. **Validated on Polar** - Card validation happens on Polar.sh
2. **Immediate Update** - Takes effect immediately
3. **Retry Failed Payments** - Automatically retries if past_due
4. **Security** - Never store card details directly
5. **PCI Compliance** - Polar.sh handles PCI compliance

#### Error Codes

```typescript
throw new TRPCError({
	code: "BAD_REQUEST",
	message: "You don't have an active subscription",
});

throw new TRPCError({
	code: "BAD_REQUEST",
	message: "Invalid payment method ID",
});

throw new TRPCError({
	code: "PAYMENT_REQUIRED",
	message: "Payment method declined. Please try another card.",
});
```

---

## 🔄 Post-Launch Endpoints

### `billing.getInvoices` - List Invoices

Get all past invoices for the user's subscription.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const getInvoicesSchema = z.object({
	limit: z.number().min(1).max(100).default(20),
	cursor: z.string().optional(), // Last invoice ID
});
```

#### Output Schema

```typescript
interface Invoice {
	id: string;
	number: string; // Human-readable invoice number
	status: "paid" | "open" | "void" | "uncollectible";
	amount: number; // In cents
	currency: "USD";
	createdAt: Date;
	paidAt?: Date;
	dueDate: Date;
	periodStart: Date;
	periodEnd: Date;
	downloadUrl: string; // PDF download link
	
	lineItems: {
		description: string;
		amount: number;
		quantity: number;
	}[];
}

interface GetInvoicesOutput {
	invoices: Invoice[];
	nextCursor?: string;
}
```

#### Usage Example

```typescript
const { invoices, nextCursor } = await trpc.billing.getInvoices.query({
	limit: 10,
});

invoices.forEach((invoice) => {
	console.log(`${invoice.number}: $${invoice.amount / 100} - ${invoice.status}`);
});
```

---

### `billing.downloadInvoice` - Download Invoice PDF

Get a temporary download URL for an invoice PDF.

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const downloadInvoiceSchema = z.object({
	invoiceId: z.string(),
});
```

#### Output Schema

```typescript
interface DownloadInvoiceOutput {
	downloadUrl: string; // Temporary signed URL (expires in 1 hour)
	expiresAt: Date;
}
```

---

### `billing.getUsage` - Get Detailed Usage Stats

Get detailed usage statistics for the current billing period.

**Type:** Query  
**Auth:** Required

#### Output Schema

```typescript
interface UsageStats {
	period: {
		start: Date;
		end: Date;
	};
	
	videos: {
		uploaded: number;
		deleted: number;
		current: number;
		limit: number | null;
	};
	
	storage: {
		used: number; // Bytes
		limit: number;
		breakdown: {
			videos: number;
			thumbnails: number;
			assets: number;
		};
	};
	
	bandwidth: {
		used: number; // Bytes transferred
		limit: number | null;
	};
	
	teamMembers: {
		active: number;
		limit: number;
	};
	
	apiCalls: {
		total: number;
		limit: number;
		breakdown: {
			reads: number;
			writes: number;
		};
	};
}
```

---

### `billing.previewUpgrade` - Preview Upgrade Cost

Calculate the cost of upgrading to a different plan (with proration).

**Type:** Query  
**Auth:** Required

#### Input Schema

```typescript
const previewUpgradeSchema = z.object({
	planId: z.string(),
	billingCycle: z.enum(["monthly", "annual"]),
});
```

#### Output Schema

```typescript
interface PreviewUpgradeOutput {
	currentPlan: {
		name: string;
		amount: number;
		remainingDays: number;
	};
	
	newPlan: {
		name: string;
		amount: number;
	};
	
	proration: {
		creditFromCurrentPlan: number; // Unused time credit
		newPlanCost: number;
		amountDueNow: number; // Immediate charge
		nextBillingAmount: number; // Full amount for next period
		nextBillingDate: Date;
	};
	
	savingsAnnual?: number; // If switching to annual
}
```

---

## 📋 Growth Phase Endpoints

### `billing.addSeats` - Add Team Seats

Add additional team member seats to subscription.

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const addSeatsSchema = z.object({
	quantity: z.number().min(1).max(100),
});
```

#### Output Schema

```typescript
interface AddSeatsOutput {
	subscription: Subscription;
	seatsAdded: number;
	newTotalSeats: number;
	proration: {
		amountDue: number; // Prorated cost for remaining period
	};
}
```

---

### `billing.removeSeats` - Remove Team Seats

Remove team member seats (takes effect at period end).

**Type:** Mutation  
**Auth:** Required

---

### `billing.applyPromoCode` - Apply Promo Code

Apply a promotional discount code to subscription.

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const applyPromoCodeSchema = z.object({
	code: z.string().toUpperCase(),
});
```

#### Output Schema

```typescript
interface ApplyPromoCodeOutput {
	discount: {
		code: string;
		type: "percentage" | "fixed";
		amount: number; // Percentage (e.g., 20) or fixed amount in cents
		duration: "once" | "repeating" | "forever";
		durationInMonths?: number; // For "repeating"
	};
	newAmount: number; // Discounted subscription amount
}
```

---

## 🎯 Scale Phase Endpoints

### `billing.reactivate` - Reactivate Subscription

Reactivate a canceled subscription before it expires.

**Type:** Mutation  
**Auth:** Required

---

### `billing.requestRefund` - Request Refund

Submit a refund request for recent payment.

**Type:** Mutation  
**Auth:** Required

#### Input Schema

```typescript
const requestRefundSchema = z.object({
	invoiceId: z.string(),
	reason: z.enum([
		"accidental_charge",
		"service_not_as_expected",
		"technical_issues",
		"other",
	]),
	description: z.string().max(500),
});
```

---

## 📊 Pricing Tiers Reference

### Free Tier

```typescript
{
	name: "Free",
	price: { monthly: 0, annual: 0 },
	features: {
		projectsLimit: 2,
		videosLimit: 5,
		storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
		videoRetentionDays: 7,
		teamMembersLimit: 2,
		basicComments: true,
		advancedComments: false,
		annotations: false,
		versionControl: false,
		customBranding: false,
	}
}
```

### Pro Tier

```typescript
{
	name: "Pro",
	price: { monthly: 2900, annual: 25200 }, // $29/mo, $252/yr (13% off)
	features: {
		projectsLimit: null, // Unlimited
		videosLimit: 50,
		storageLimit: 100 * 1024 * 1024 * 1024, // 100GB
		videoRetentionDays: 90,
		teamMembersLimit: 10,
		basicComments: true,
		advancedComments: true,
		annotations: true,
		versionControl: true,
		customBranding: true,
	}
}
```

### Team Tier

```typescript
{
	name: "Team",
	price: { monthly: 9900, annual: 79200 }, // $99/mo, $792/yr (20% off)
	features: {
		projectsLimit: null,
		videosLimit: 200,
		storageLimit: 500 * 1024 * 1024 * 1024, // 500GB
		videoRetentionDays: null, // Unlimited
		teamMembersLimit: 50,
		basicComments: true,
		advancedComments: true,
		annotations: true,
		versionControl: true,
		customBranding: true,
		prioritySupport: true,
		advancedAnalytics: true,
	}
}
```

### Enterprise Tier

```typescript
{
	name: "Enterprise",
	price: "Custom pricing",
	features: {
		// Everything unlimited
		sso: true,
		apiAccess: true,
		whiteLabeling: true,
		sla: true,
		dedicatedSupport: true,
	}
}
```

---

## 🔗 Related APIs

- [Quota & Usage API](./14-quota) - Usage tracking and enforcement
- [Teams API](./08-teams) - Team management (seats)
- [Authentication API](./01-authentication) - User sessions

---

## 🛡️ Security Considerations

1. **PCI Compliance** - Polar.sh handles all card processing
2. **Never Store Cards** - Only store Polar payment method IDs
3. **Webhooks** - Verify Polar webhook signatures
4. **Proration** - Always calculate server-side
5. **Audit Trail** - Log all subscription changes
6. **Rate Limiting** - Prevent subscription abuse

---

## 📚 Polar.sh Webhooks

Handle these webhook events from Polar.sh:

```typescript
// packages/api/src/webhooks/polar.ts
export async function handlePolarWebhook(event: PolarWebhookEvent) {
	switch (event.type) {
		case "subscription.created":
			// Activate new subscription
			break;
			
		case "subscription.updated":
			// Update subscription details
			break;
			
		case "subscription.canceled":
			// Mark as canceled
			break;
			
		case "invoice.paid":
			// Mark invoice as paid, extend access
			break;
			
		case "invoice.payment_failed":
			// Mark subscription as past_due, send notification
			break;
			
		case "customer.subscription.deleted":
			// Downgrade to free tier
			break;
	}
}
```

---

**Last Updated:** November 22, 2025  
**API Version:** 1.0.0 (MVP)
