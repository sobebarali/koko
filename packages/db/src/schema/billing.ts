import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const plan = sqliteTable("plan", {
	id: text("id").primaryKey(),
	name: text("name", { enum: ["free", "pro", "team", "enterprise"] })
		.notNull()
		.unique(),
	displayName: text("display_name").notNull(),
	description: text("description"),
	priceMonthly: integer("price_monthly").default(0).notNull(),
	priceAnnual: integer("price_annual").default(0).notNull(),
	currency: text("currency").default("USD").notNull(),
	limits: text("limits", { mode: "json" })
		.$type<{
			projectsLimit: number | null;
			videosLimit: number | null;
			storageLimit: number;
			videoRetentionDays: number | null;
			teamMembersLimit: number;
			uploadsPerHour: number;
		}>()
		.notNull(),
	features: text("features", { mode: "json" })
		.$type<{
			basicComments: boolean;
			advancedComments: boolean;
			annotations: boolean;
			versionControl: boolean;
			customBranding: boolean;
			prioritySupport: boolean;
			apiAccess: boolean;
		}>()
		.notNull(),
	popular: integer("popular", { mode: "boolean" }).default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull(),
});

export const subscription = sqliteTable(
	"subscription",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" })
			.unique(),
		planId: text("plan_id")
			.notNull()
			.references(() => plan.id, { onDelete: "restrict" }),
		billingCycle: text("billing_cycle", { enum: ["monthly", "annual"] })
			.default("monthly")
			.notNull(),
		status: text("status", {
			enum: ["active", "canceled", "past_due", "trialing", "paused"],
		})
			.default("active")
			.notNull(),
		currentPeriodStart: integer("current_period_start", {
			mode: "timestamp_ms",
		}).notNull(),
		currentPeriodEnd: integer("current_period_end", {
			mode: "timestamp_ms",
		}).notNull(),
		trialEnd: integer("trial_end", { mode: "timestamp_ms" }),
		cancelAt: integer("cancel_at", { mode: "timestamp_ms" }),
		canceledAt: integer("canceled_at", { mode: "timestamp_ms" }),
		amount: integer("amount").notNull(),
		currency: text("currency").default("USD").notNull(),
		polarSubscriptionId: text("polar_subscription_id").unique(),
		polarCustomerId: text("polar_customer_id"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("subscription_user_idx").on(table.userId),
		index("subscription_plan_idx").on(table.planId),
		index("subscription_status_idx").on(table.status),
		index("subscription_polar_idx").on(table.polarSubscriptionId),
	],
);

export const invoice = sqliteTable(
	"invoice",
	{
		id: text("id").primaryKey(),
		subscriptionId: text("subscription_id")
			.notNull()
			.references(() => subscription.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		number: text("number").notNull().unique(),
		status: text("status", {
			enum: ["draft", "open", "paid", "void", "uncollectible"],
		})
			.default("draft")
			.notNull(),
		amount: integer("amount").notNull(),
		currency: text("currency").default("USD").notNull(),
		periodStart: integer("period_start", { mode: "timestamp_ms" }).notNull(),
		periodEnd: integer("period_end", { mode: "timestamp_ms" }).notNull(),
		dueDate: integer("due_date", { mode: "timestamp_ms" }).notNull(),
		paidAt: integer("paid_at", { mode: "timestamp_ms" }),
		polarInvoiceId: text("polar_invoice_id").unique(),
		downloadUrl: text("download_url"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("invoice_subscription_idx").on(table.subscriptionId),
		index("invoice_user_idx").on(table.userId),
		index("invoice_status_idx").on(table.status),
	],
);

export const planRelations = relations(plan, ({ many }) => ({
	subscriptions: many(subscription),
}));

export const subscriptionRelations = relations(
	subscription,
	({ one, many }) => ({
		user: one(user, { fields: [subscription.userId], references: [user.id] }),
		plan: one(plan, { fields: [subscription.planId], references: [plan.id] }),
		invoices: many(invoice),
	}),
);

export const invoiceRelations = relations(invoice, ({ one }) => ({
	subscription: one(subscription, {
		fields: [invoice.subscriptionId],
		references: [subscription.id],
	}),
	user: one(user, { fields: [invoice.userId], references: [user.id] }),
}));
