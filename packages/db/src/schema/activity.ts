import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { shareLink } from "./share";
import { video } from "./video";

export const activityLog = sqliteTable(
	"activity_log",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		action: text("action", {
			enum: [
				"project.create",
				"project.update",
				"project.delete",
				"project.archive",
				"video.upload",
				"video.update",
				"video.delete",
				"video.view",
				"comment.create",
				"comment.update",
				"comment.delete",
				"comment.resolve",
				"team.create",
				"team.update",
				"team.member.add",
				"team.member.remove",
				"share.create",
				"share.access",
				"share.revoke",
				"subscription.create",
				"subscription.upgrade",
				"subscription.downgrade",
				"subscription.cancel",
				"auth.login",
				"auth.logout",
				"auth.password_change",
			],
		}).notNull(),
		resourceType: text("resource_type", {
			enum: [
				"project",
				"video",
				"comment",
				"team",
				"share",
				"subscription",
				"user",
			],
		}),
		resourceId: text("resource_id"),
		metadata: text("metadata", { mode: "json" }).$type<
			Record<string, unknown>
		>(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("activity_user_idx").on(table.userId),
		index("activity_action_idx").on(table.action),
		index("activity_resource_idx").on(table.resourceType, table.resourceId),
		index("activity_created_idx").on(table.createdAt),
	],
);

export const videoView = sqliteTable(
	"video_view",
	{
		id: text("id").primaryKey(),
		videoId: text("video_id")
			.notNull()
			.references(() => video.id, { onDelete: "cascade" }),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		sessionId: text("session_id"),
		watchDuration: integer("watch_duration").default(0).notNull(),
		completionPercentage: integer("completion_percentage").default(0).notNull(),
		source: text("source", { enum: ["direct", "share_link", "embed"] }),
		shareLinkId: text("share_link_id").references(() => shareLink.id, {
			onDelete: "set null",
		}),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		country: text("country"),
		viewedAt: integer("viewed_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("video_view_video_idx").on(table.videoId),
		index("video_view_user_idx").on(table.userId),
		index("video_view_date_idx").on(table.viewedAt),
	],
);

export const dataExportRequest = sqliteTable(
	"data_export_request",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: text("status", {
			enum: ["pending", "processing", "completed", "failed", "expired"],
		})
			.default("pending")
			.notNull(),
		format: text("format", { enum: ["json", "csv"] })
			.default("json")
			.notNull(),
		downloadUrl: text("download_url"),
		downloadExpiresAt: integer("download_expires_at", { mode: "timestamp_ms" }),
		startedAt: integer("started_at", { mode: "timestamp_ms" }),
		completedAt: integer("completed_at", { mode: "timestamp_ms" }),
		errorMessage: text("error_message"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("data_export_user_idx").on(table.userId),
		index("data_export_status_idx").on(table.status),
	],
);

export const dataDeletionRequest = sqliteTable(
	"data_deletion_request",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: text("status", {
			enum: ["pending", "processing", "completed", "failed"],
		})
			.default("pending")
			.notNull(),
		confirmedAt: integer("confirmed_at", { mode: "timestamp_ms" }),
		scheduledFor: integer("scheduled_for", { mode: "timestamp_ms" }),
		processedAt: integer("processed_at", { mode: "timestamp_ms" }),
		deletedData: text("deleted_data", { mode: "json" }).$type<{
			projects: number;
			videos: number;
			comments: number;
			assets: number;
		}>(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("data_deletion_user_idx").on(table.userId),
		index("data_deletion_status_idx").on(table.status),
		index("data_deletion_scheduled_idx").on(table.scheduledFor),
	],
);

export const activityLogRelations = relations(activityLog, ({ one }) => ({
	user: one(user, { fields: [activityLog.userId], references: [user.id] }),
}));

export const videoViewRelations = relations(videoView, ({ one }) => ({
	video: one(video, { fields: [videoView.videoId], references: [video.id] }),
	user: one(user, { fields: [videoView.userId], references: [user.id] }),
	shareLink: one(shareLink, {
		fields: [videoView.shareLinkId],
		references: [shareLink.id],
	}),
}));

export const dataExportRequestRelations = relations(
	dataExportRequest,
	({ one }) => ({
		user: one(user, {
			fields: [dataExportRequest.userId],
			references: [user.id],
		}),
	}),
);

export const dataDeletionRequestRelations = relations(
	dataDeletionRequest,
	({ one }) => ({
		user: one(user, {
			fields: [dataDeletionRequest.userId],
			references: [user.id],
		}),
	}),
);
