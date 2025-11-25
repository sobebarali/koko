import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const usageSnapshot = sqliteTable(
	"usage_snapshot",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		projectCount: integer("project_count").notNull(),
		videoCount: integer("video_count").notNull(),
		storageUsed: integer("storage_used").notNull(),
		teamMemberCount: integer("team_member_count").notNull(),
		bandwidthUsed: integer("bandwidth_used").default(0).notNull(),
		periodStart: integer("period_start", { mode: "timestamp_ms" }).notNull(),
		periodEnd: integer("period_end", { mode: "timestamp_ms" }).notNull(),
		snapshotAt: integer("snapshot_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("usage_snapshot_user_idx").on(table.userId),
		index("usage_snapshot_date_idx").on(table.snapshotAt),
		index("usage_snapshot_user_period_idx").on(table.userId, table.periodStart),
	],
);

export const apiUsage = sqliteTable(
	"api_usage",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		usageType: text("usage_type", {
			enum: ["read", "write", "upload"],
		}).notNull(),
		count: integer("count").default(0).notNull(),
		windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
		windowEnd: integer("window_end", { mode: "timestamp_ms" }).notNull(),
	},
	(table) => [
		index("api_usage_user_idx").on(table.userId),
		index("api_usage_user_type_window_idx").on(
			table.userId,
			table.usageType,
			table.windowStart,
		),
	],
);

export const usageSnapshotRelations = relations(usageSnapshot, ({ one }) => ({
	user: one(user, { fields: [usageSnapshot.userId], references: [user.id] }),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
	user: one(user, { fields: [apiUsage.userId], references: [user.id] }),
}));
