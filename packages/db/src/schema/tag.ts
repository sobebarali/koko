import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { project } from "./project";
import { team } from "./team";
import { video } from "./video";

export const tag = sqliteTable(
	"tag",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		color: text("color"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
		usageCount: integer("usage_count").default(0).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("tag_user_idx").on(table.userId),
		index("tag_team_idx").on(table.teamId),
		index("tag_user_slug_idx").on(table.userId, table.slug),
	],
);

export const videoTag = sqliteTable(
	"video_tag",
	{
		videoId: text("video_id")
			.notNull()
			.references(() => video.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => tag.id, { onDelete: "cascade" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("video_tag_video_idx").on(table.videoId),
		index("video_tag_tag_idx").on(table.tagId),
		index("video_tag_unique_idx").on(table.videoId, table.tagId),
	],
);

export const projectTag = sqliteTable(
	"project_tag",
	{
		projectId: text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => tag.id, { onDelete: "cascade" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("project_tag_project_idx").on(table.projectId),
		index("project_tag_tag_idx").on(table.tagId),
		index("project_tag_unique_idx").on(table.projectId, table.tagId),
	],
);

export const tagRelations = relations(tag, ({ one, many }) => ({
	user: one(user, { fields: [tag.userId], references: [user.id] }),
	team: one(team, { fields: [tag.teamId], references: [team.id] }),
	videoTags: many(videoTag),
	projectTags: many(projectTag),
}));

export const videoTagRelations = relations(videoTag, ({ one }) => ({
	video: one(video, { fields: [videoTag.videoId], references: [video.id] }),
	tag: one(tag, { fields: [videoTag.tagId], references: [tag.id] }),
}));

export const projectTagRelations = relations(projectTag, ({ one }) => ({
	project: one(project, {
		fields: [projectTag.projectId],
		references: [project.id],
	}),
	tag: one(tag, { fields: [projectTag.tagId], references: [tag.id] }),
}));
