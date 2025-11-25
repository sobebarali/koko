import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { project } from "./project";

export const assetFolder = sqliteTable(
	"asset_folder",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		parentId: text("parent_id"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("asset_folder_project_idx").on(table.projectId),
		index("asset_folder_parent_idx").on(table.parentId),
	],
);

export const asset = sqliteTable(
	"asset",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		uploadedBy: text("uploaded_by")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		name: text("name").notNull(),
		originalFileName: text("original_file_name").notNull(),
		fileSize: integer("file_size").notNull(),
		mimeType: text("mime_type").notNull(),
		storageKey: text("storage_key").notNull(),
		storageUrl: text("storage_url").notNull(),
		folderId: text("folder_id").references(() => assetFolder.id, {
			onDelete: "set null",
		}),
		description: text("description"),
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
		index("asset_project_idx").on(table.projectId),
		index("asset_uploaded_by_idx").on(table.uploadedBy),
		index("asset_folder_idx").on(table.folderId),
	],
);

export const assetFolderRelations = relations(assetFolder, ({ one, many }) => ({
	project: one(project, {
		fields: [assetFolder.projectId],
		references: [project.id],
	}),
	parent: one(assetFolder, {
		fields: [assetFolder.parentId],
		references: [assetFolder.id],
		relationName: "children",
	}),
	children: many(assetFolder, { relationName: "children" }),
	assets: many(asset),
}));

export const assetRelations = relations(asset, ({ one }) => ({
	project: one(project, {
		fields: [asset.projectId],
		references: [project.id],
	}),
	uploader: one(user, { fields: [asset.uploadedBy], references: [user.id] }),
	folder: one(assetFolder, {
		fields: [asset.folderId],
		references: [assetFolder.id],
	}),
}));
