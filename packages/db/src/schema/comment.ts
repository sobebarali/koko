import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { video } from "./video";

export const comment = sqliteTable(
	"comment",
	{
		id: text("id").primaryKey(),
		videoId: text("video_id")
			.notNull()
			.references(() => video.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		text: text("text").notNull(),
		timecode: integer("timecode").notNull(),
		parentId: text("parent_id"),
		replyCount: integer("reply_count").default(0).notNull(),
		resolved: integer("resolved", { mode: "boolean" }).default(false).notNull(),
		resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
		resolvedBy: text("resolved_by").references(() => user.id, {
			onDelete: "set null",
		}),
		edited: integer("edited", { mode: "boolean" }).default(false).notNull(),
		editedAt: integer("edited_at", { mode: "timestamp_ms" }),
		mentions: text("mentions", { mode: "json" }).$type<string[]>().default([]),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("comment_video_idx").on(table.videoId),
		index("comment_author_idx").on(table.authorId),
		index("comment_parent_idx").on(table.parentId),
		index("comment_timecode_idx").on(table.timecode),
		index("comment_resolved_idx").on(table.resolved),
		index("comment_video_timecode_idx").on(table.videoId, table.timecode),
		index("comment_video_resolved_idx").on(table.videoId, table.resolved),
	],
);

export const annotation = sqliteTable(
	"annotation",
	{
		id: text("id").primaryKey(),
		videoId: text("video_id")
			.notNull()
			.references(() => video.id, { onDelete: "cascade" }),
		commentId: text("comment_id").references(() => comment.id, {
			onDelete: "cascade",
		}),
		authorId: text("author_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		timecode: integer("timecode").notNull(),
		frameNumber: integer("frame_number"),
		type: text("type", {
			enum: ["rectangle", "circle", "arrow", "freehand", "text", "spotlight"],
		}).notNull(),
		data: text("data", { mode: "json" })
			.$type<{
				x: number;
				y: number;
				width?: number;
				height?: number;
				points?: { x: number; y: number }[];
				text?: string;
				color: string;
				strokeWidth: number;
			}>()
			.notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("annotation_video_idx").on(table.videoId),
		index("annotation_comment_idx").on(table.commentId),
		index("annotation_author_idx").on(table.authorId),
		index("annotation_timecode_idx").on(table.timecode),
	],
);

export const commentRelations = relations(comment, ({ one, many }) => ({
	video: one(video, { fields: [comment.videoId], references: [video.id] }),
	author: one(user, { fields: [comment.authorId], references: [user.id] }),
	parent: one(comment, {
		fields: [comment.parentId],
		references: [comment.id],
		relationName: "replies",
	}),
	replies: many(comment, { relationName: "replies" }),
	resolver: one(user, { fields: [comment.resolvedBy], references: [user.id] }),
	annotations: many(annotation),
}));

export const annotationRelations = relations(annotation, ({ one }) => ({
	video: one(video, { fields: [annotation.videoId], references: [video.id] }),
	comment: one(comment, {
		fields: [annotation.commentId],
		references: [comment.id],
	}),
	author: one(user, { fields: [annotation.authorId], references: [user.id] }),
}));
