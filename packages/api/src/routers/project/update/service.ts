import { db } from "@koko/db";
import { project } from "@koko/db/schema/project";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { updateCollectionName } from "../../../lib/services/bunny-collection-service";
import { projectListSelect } from "../constants";
import type { UpdateProjectInput, UpdateProjectOutput } from "./type";

export async function updateProject({
	userId,
	id,
	name,
	description,
	color,
	status,
	logger,
}: {
	userId: string;
	logger: Logger;
} & UpdateProjectInput): Promise<UpdateProjectOutput> {
	const fieldsToUpdate = Object.entries({ name, description, color, status })
		.filter(([, value]) => value !== undefined)
		.map(([key]) => key);

	logger.debug(
		{
			event: "update_project_start",
			projectId: id,
			userId,
			fields: fieldsToUpdate,
		},
		"Updating project",
	);

	try {
		const existing = await db.query.project.findFirst({
			where: eq(project.id, id),
			columns: {
				ownerId: true,
				name: true,
				bunnyCollectionId: true,
			},
		});

		if (!existing) {
			logger.warn(
				{ event: "update_project_not_found", projectId: id },
				"Project not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Project not found",
			});
		}

		if (existing.ownerId !== userId) {
			logger.warn(
				{ event: "update_project_forbidden", projectId: id, userId },
				"User is not the owner of this project",
			);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the project owner can update this project",
			});
		}

		// Sync collection name if name is changing and project has a collection
		if (
			name !== undefined &&
			name !== existing.name &&
			existing.bunnyCollectionId
		) {
			logger.debug(
				{
					event: "update_collection_name_start",
					projectId: id,
					collectionId: existing.bunnyCollectionId,
					oldName: existing.name,
					newName: name,
				},
				"Syncing collection name",
			);

			const success = await updateCollectionName({
				collectionId: existing.bunnyCollectionId,
				name,
			});

			if (!success) {
				logger.error(
					{
						event: "update_collection_name_failed",
						projectId: id,
						collectionId: existing.bunnyCollectionId,
						name,
					},
					"Failed to update Bunny Collection name, but allowing project update to continue",
				);
				// Don't throw - allow project update to continue
			} else {
				logger.debug(
					{
						event: "update_collection_name_success",
						projectId: id,
						collectionId: existing.bunnyCollectionId,
					},
					"Collection name synced successfully",
				);
			}
		}

		const updateData: Record<string, string | undefined> = {};
		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;
		if (color !== undefined) updateData.color = color;
		if (status !== undefined) updateData.status = status;

		const [updated] = await db
			.update(project)
			.set(updateData)
			.where(eq(project.id, id))
			.returning(projectListSelect);

		if (!updated) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to update project.",
			});
		}

		logger.info(
			{
				event: "update_project_success",
				projectId: id,
				userId,
				fields: fieldsToUpdate,
			},
			"Project updated successfully",
		);

		return { project: updated };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "update_project_error",
				projectId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to update project",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update project.",
		});
	}
}
