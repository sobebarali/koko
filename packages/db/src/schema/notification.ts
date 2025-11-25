import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const notification = sqliteTable(
	"notification",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: text("type", {
			enum: [
				"comment_new",
				"comment_reply",
				"comment_mention",
				"comment_resolved",
				"video_uploaded",
				"video_ready",
				"video_failed",
				"project_invite",
				"project_role_changed",
				"team_invite",
				"team_member_joined",
				"quota_warning",
				"quota_exceeded",
				"subscription_renewed",
				"subscription_expiring",
				"payment_failed",
			],
		}).notNull(),
		title: text("title").notNull(),
		message: text("message").notNull(),
		resourceType: text("resource_type", {
			enum: ["project", "video", "comment", "team", "subscription"],
		}),
		resourceId: text("resource_id"),
		actorId: text("actor_id").references(() => user.id, {
			onDelete: "set null",
		}),
		read: integer("read", { mode: "boolean" }).default(false).notNull(),
		readAt: integer("read_at", { mode: "timestamp_ms" }),
		emailSent: integer("email_sent", { mode: "boolean" })
			.default(false)
			.notNull(),
		emailSentAt: integer("email_sent_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("notification_user_idx").on(table.userId),
		index("notification_type_idx").on(table.type),
		index("notification_user_read_idx").on(table.userId, table.read),
		index("notification_created_idx").on(table.createdAt),
	],
);

export const notificationPreference = sqliteTable(
	"notification_preference",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" })
			.unique(),
		emailComments: integer("email_comments", { mode: "boolean" })
			.default(true)
			.notNull(),
		emailMentions: integer("email_mentions", { mode: "boolean" })
			.default(true)
			.notNull(),
		emailVideoReady: integer("email_video_ready", { mode: "boolean" })
			.default(true)
			.notNull(),
		emailProjectInvites: integer("email_project_invites", { mode: "boolean" })
			.default(true)
			.notNull(),
		emailDigest: text("email_digest", { enum: ["none", "daily", "weekly"] })
			.default("daily")
			.notNull(),
		inAppComments: integer("in_app_comments", { mode: "boolean" })
			.default(true)
			.notNull(),
		inAppMentions: integer("in_app_mentions", { mode: "boolean" })
			.default(true)
			.notNull(),
		inAppVideoReady: integer("in_app_video_ready", { mode: "boolean" })
			.default(true)
			.notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("notification_pref_user_idx").on(table.userId)],
);

export const notificationRelations = relations(notification, ({ one }) => ({
	user: one(user, { fields: [notification.userId], references: [user.id] }),
	actor: one(user, { fields: [notification.actorId], references: [user.id] }),
}));

export const notificationPreferenceRelations = relations(
	notificationPreference,
	({ one }) => ({
		user: one(user, {
			fields: [notificationPreference.userId],
			references: [user.id],
		}),
	}),
);
