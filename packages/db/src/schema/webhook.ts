import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { team } from "./team";

export const webhook = sqliteTable(
	"webhook",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		url: text("url").notNull(),
		secret: text("secret").notNull(),
		events: text("events", { mode: "json" }).$type<string[]>().notNull(),
		isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
		lastTriggeredAt: integer("last_triggered_at", { mode: "timestamp_ms" }),
		successCount: integer("success_count").default(0).notNull(),
		failureCount: integer("failure_count").default(0).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("webhook_user_idx").on(table.userId),
		index("webhook_team_idx").on(table.teamId),
	],
);

export const webhookDelivery = sqliteTable(
	"webhook_delivery",
	{
		id: text("id").primaryKey(),
		webhookId: text("webhook_id")
			.notNull()
			.references(() => webhook.id, { onDelete: "cascade" }),
		event: text("event").notNull(),
		payload: text("payload", { mode: "json" })
			.$type<Record<string, unknown>>()
			.notNull(),
		status: text("status", { enum: ["pending", "success", "failed"] })
			.default("pending")
			.notNull(),
		statusCode: integer("status_code"),
		responseBody: text("response_body"),
		errorMessage: text("error_message"),
		attempts: integer("attempts").default(0).notNull(),
		nextRetryAt: integer("next_retry_at", { mode: "timestamp_ms" }),
		deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("webhook_delivery_webhook_idx").on(table.webhookId),
		index("webhook_delivery_status_idx").on(table.status),
		index("webhook_delivery_retry_idx").on(table.nextRetryAt),
	],
);

export const webhookRelations = relations(webhook, ({ one, many }) => ({
	user: one(user, { fields: [webhook.userId], references: [user.id] }),
	team: one(team, { fields: [webhook.teamId], references: [team.id] }),
	deliveries: many(webhookDelivery),
}));

export const webhookDeliveryRelations = relations(
	webhookDelivery,
	({ one }) => ({
		webhook: one(webhook, {
			fields: [webhookDelivery.webhookId],
			references: [webhook.id],
		}),
	}),
);
