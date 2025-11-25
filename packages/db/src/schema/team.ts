import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { project } from "./project";

export const team = sqliteTable(
	"team",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		description: text("description"),
		logo: text("logo"),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		defaultProjectRole: text("default_project_role", {
			enum: ["editor", "reviewer", "viewer"],
		})
			.default("viewer")
			.notNull(),
		allowMemberInvites: integer("allow_member_invites", { mode: "boolean" })
			.default(false)
			.notNull(),
		memberCount: integer("member_count").default(1).notNull(),
		projectCount: integer("project_count").default(0).notNull(),
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
		index("team_owner_idx").on(table.ownerId),
		index("team_slug_idx").on(table.slug),
	],
);

export const teamMember = sqliteTable(
	"team_member",
	{
		id: text("id").primaryKey(),
		teamId: text("team_id")
			.notNull()
			.references(() => team.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role", { enum: ["owner", "admin", "member"] })
			.default("member")
			.notNull(),
		invitedBy: text("invited_by").references(() => user.id, {
			onDelete: "set null",
		}),
		joinedAt: integer("joined_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("team_member_team_idx").on(table.teamId),
		index("team_member_user_idx").on(table.userId),
		index("team_member_unique_idx").on(table.teamId, table.userId),
	],
);

export const invitation = sqliteTable(
	"invitation",
	{
		id: text("id").primaryKey(),
		type: text("type", { enum: ["team", "project"] }).notNull(),
		teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
		projectId: text("project_id").references(() => project.id, {
			onDelete: "cascade",
		}),
		email: text("email").notNull(),
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
		invitedBy: text("invited_by")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").notNull(),
		token: text("token").notNull().unique(),
		status: text("status", {
			enum: ["pending", "accepted", "declined", "expired", "canceled"],
		})
			.default("pending")
			.notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
		message: text("message"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("invitation_email_idx").on(table.email),
		index("invitation_token_idx").on(table.token),
		index("invitation_team_idx").on(table.teamId),
		index("invitation_project_idx").on(table.projectId),
		index("invitation_status_idx").on(table.status),
	],
);

export const teamRelations = relations(team, ({ one, many }) => ({
	owner: one(user, { fields: [team.ownerId], references: [user.id] }),
	members: many(teamMember),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
	team: one(team, { fields: [teamMember.teamId], references: [team.id] }),
	user: one(user, { fields: [teamMember.userId], references: [user.id] }),
	inviter: one(user, { fields: [teamMember.invitedBy], references: [user.id] }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	team: one(team, { fields: [invitation.teamId], references: [team.id] }),
	project: one(project, {
		fields: [invitation.projectId],
		references: [project.id],
	}),
	user: one(user, { fields: [invitation.userId], references: [user.id] }),
	inviter: one(user, { fields: [invitation.invitedBy], references: [user.id] }),
}));
