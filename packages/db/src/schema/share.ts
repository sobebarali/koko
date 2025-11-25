import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const shareLink = sqliteTable(
	"share_link",
	{
		id: text("id").primaryKey(),
		resourceType: text("resource_type", {
			enum: ["project", "video"],
		}).notNull(),
		resourceId: text("resource_id").notNull(),
		createdBy: text("created_by")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		token: text("token").notNull().unique(),
		permission: text("permission", { enum: ["view", "comment", "edit"] })
			.default("view")
			.notNull(),
		password: text("password"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
		maxViews: integer("max_views"),
		viewCount: integer("view_count").default(0).notNull(),
		watermarkEnabled: integer("watermark_enabled", { mode: "boolean" })
			.default(false)
			.notNull(),
		watermarkText: text("watermark_text"),
		allowedEmails: text("allowed_emails", { mode: "json" }).$type<string[]>(),
		allowedDomains: text("allowed_domains", { mode: "json" }).$type<string[]>(),
		isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("share_link_token_idx").on(table.token),
		index("share_link_resource_idx").on(table.resourceType, table.resourceId),
		index("share_link_created_by_idx").on(table.createdBy),
	],
);

export const shareLinkAccess = sqliteTable(
	"share_link_access",
	{
		id: text("id").primaryKey(),
		shareLinkId: text("share_link_id")
			.notNull()
			.references(() => shareLink.id, { onDelete: "cascade" }),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		email: text("email"),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		accessedAt: integer("accessed_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("share_access_link_idx").on(table.shareLinkId),
		index("share_access_user_idx").on(table.userId),
		index("share_access_date_idx").on(table.accessedAt),
	],
);

export const shareLinkRelations = relations(shareLink, ({ one, many }) => ({
	creator: one(user, { fields: [shareLink.createdBy], references: [user.id] }),
	accesses: many(shareLinkAccess),
}));

export const shareLinkAccessRelations = relations(
	shareLinkAccess,
	({ one }) => ({
		shareLink: one(shareLink, {
			fields: [shareLinkAccess.shareLinkId],
			references: [shareLink.id],
		}),
		user: one(user, {
			fields: [shareLinkAccess.userId],
			references: [user.id],
		}),
	}),
);
