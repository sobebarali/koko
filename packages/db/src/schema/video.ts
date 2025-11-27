import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { project } from "./project";

export const video = sqliteTable(
	"video",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		uploadedBy: text("uploaded_by")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		bunnyVideoId: text("bunny_video_id").notNull(),
		bunnyLibraryId: text("bunny_library_id").notNull(),
		bunnyCollectionId: text("bunny_collection_id"),
		title: text("title").notNull(),
		description: text("description"),
		tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
		originalFileName: text("original_file_name").notNull(),
		fileSize: integer("file_size").notNull(),
		mimeType: text("mime_type").notNull(),
		duration: integer("duration").default(0).notNull(),
		width: integer("width").default(0).notNull(),
		height: integer("height").default(0).notNull(),
		fps: integer("fps").default(0).notNull(),
		status: text("status", {
			enum: ["uploading", "processing", "ready", "failed"],
		})
			.default("uploading")
			.notNull(),
		processingProgress: integer("processing_progress"),
		errorMessage: text("error_message"),
		streamingUrl: text("streaming_url"),
		thumbnailUrl: text("thumbnail_url"),
		viewCount: integer("view_count").default(0).notNull(),
		commentCount: integer("comment_count").default(0).notNull(),
		versionNumber: integer("version_number").default(1).notNull(),
		parentVideoId: text("parent_video_id"),
		isCurrentVersion: integer("is_current_version", { mode: "boolean" })
			.default(true)
			.notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
		deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		index("video_project_idx").on(table.projectId),
		index("video_uploaded_by_idx").on(table.uploadedBy),
		index("video_status_idx").on(table.status),
		index("video_bunny_idx").on(table.bunnyVideoId),
		index("video_created_idx").on(table.createdAt),
		index("video_project_status_idx").on(table.projectId, table.status),
		index("video_parent_idx").on(table.parentVideoId),
	],
);

export const transcription = sqliteTable(
	"transcription",
	{
		id: text("id").primaryKey(),
		videoId: text("video_id")
			.notNull()
			.references(() => video.id, { onDelete: "cascade" })
			.unique(),
		status: text("status", {
			enum: ["pending", "processing", "completed", "failed"],
		})
			.default("pending")
			.notNull(),
		language: text("language").default("en").notNull(),
		content: text("content", { mode: "json" }).$type<{
			segments: {
				start: number;
				end: number;
				text: string;
				confidence: number;
			}[];
		}>(),
		fullText: text("full_text"),
		provider: text("provider", { enum: ["bunny", "openai", "deepgram"] }),
		providerId: text("provider_id"),
		errorMessage: text("error_message"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		completedAt: integer("completed_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		index("transcription_video_idx").on(table.videoId),
		index("transcription_status_idx").on(table.status),
	],
);

export const sceneDetection = sqliteTable(
	"scene_detection",
	{
		id: text("id").primaryKey(),
		videoId: text("video_id")
			.notNull()
			.references(() => video.id, { onDelete: "cascade" })
			.unique(),
		status: text("status", {
			enum: ["pending", "processing", "completed", "failed"],
		})
			.default("pending")
			.notNull(),
		scenes: text("scenes", { mode: "json" }).$type<
			{
				start: number;
				end: number;
				thumbnailUrl?: string;
				description?: string;
			}[]
		>(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		completedAt: integer("completed_at", { mode: "timestamp_ms" }),
	},
	(table) => [index("scene_detection_video_idx").on(table.videoId)],
);

export const videoRelations = relations(video, ({ one }) => ({
	project: one(project, {
		fields: [video.projectId],
		references: [project.id],
	}),
	uploader: one(user, { fields: [video.uploadedBy], references: [user.id] }),
	parentVideo: one(video, {
		fields: [video.parentVideoId],
		references: [video.id],
	}),
	transcription: one(transcription),
	sceneDetection: one(sceneDetection),
}));

export const transcriptionRelations = relations(transcription, ({ one }) => ({
	video: one(video, {
		fields: [transcription.videoId],
		references: [video.id],
	}),
}));

export const sceneDetectionRelations = relations(sceneDetection, ({ one }) => ({
	video: one(video, {
		fields: [sceneDetection.videoId],
		references: [video.id],
	}),
}));
