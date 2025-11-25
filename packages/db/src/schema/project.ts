import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const project = sqliteTable(
	"project",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		description: text("description"),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: text("status", { enum: ["active", "archived", "deleted"] })
			.default("active")
			.notNull(),
		color: text("color"),
		thumbnail: text("thumbnail"),
		videoCount: integer("video_count").default(0).notNull(),
		memberCount: integer("member_count").default(1).notNull(),
		commentCount: integer("comment_count").default(0).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
		archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
		deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		index("project_owner_idx").on(table.ownerId),
		index("project_status_idx").on(table.status),
		index("project_created_idx").on(table.createdAt),
		index("project_owner_status_idx").on(table.ownerId, table.status),
	],
);

export const projectMember = sqliteTable(
	"project_member",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role", { enum: ["owner", "editor", "reviewer", "viewer"] })
			.default("viewer")
			.notNull(),
		canUpload: integer("can_upload", { mode: "boolean" })
			.default(false)
			.notNull(),
		canComment: integer("can_comment", { mode: "boolean" })
			.default(true)
			.notNull(),
		canInvite: integer("can_invite", { mode: "boolean" })
			.default(false)
			.notNull(),
		canDelete: integer("can_delete", { mode: "boolean" })
			.default(false)
			.notNull(),
		invitedBy: text("invited_by").references(() => user.id, {
			onDelete: "set null",
		}),
		joinedAt: integer("joined_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("project_member_project_idx").on(table.projectId),
		index("project_member_user_idx").on(table.userId),
		index("project_member_unique_idx").on(table.projectId, table.userId),
	],
);

export const projectRelations = relations(project, ({ one, many }) => ({
	owner: one(user, { fields: [project.ownerId], references: [user.id] }),
	members: many(projectMember),
}));

export const projectMemberRelations = relations(projectMember, ({ one }) => ({
	project: one(project, {
		fields: [projectMember.projectId],
		references: [project.id],
	}),
	user: one(user, { fields: [projectMember.userId], references: [user.id] }),
	inviter: one(user, {
		fields: [projectMember.invitedBy],
		references: [user.id],
	}),
}));
