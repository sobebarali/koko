import { db } from "@koko/db";
import { project } from "@koko/db/schema/project";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type { DeleteProjectOutput } from "./type";

export async function deleteProject({
	userId,
	id,
	logger,
}: {
	userId: string;
	id: string;
	logger: Logger;
}): Promise<DeleteProjectOutput> {
	logger.debug(
		{ event: "delete_project_start", projectId: id, userId },
		"Deleting project (soft delete)",
	);

	try {
		const existing = await db
			.select({ ownerId: project.ownerId, status: project.status })
			.from(project)
			.where(eq(project.id, id))
			.limit(1);

		if (existing.length === 0) {
			logger.warn(
				{ event: "delete_project_not_found", projectId: id },
				"Project not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Project not found",
			});
		}

		if (existing[0]?.ownerId !== userId) {
			logger.warn(
				{ event: "delete_project_forbidden", projectId: id, userId },
				"User is not the owner of this project",
			);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the project owner can delete this project",
			});
		}

		if (existing[0]?.status === "deleted") {
			logger.warn(
				{ event: "delete_project_already_deleted", projectId: id },
				"Project is already deleted",
			);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Project is already deleted",
			});
		}

		await db
			.update(project)
			.set({
				status: "deleted",
				deletedAt: new Date(),
			})
			.where(eq(project.id, id));

		logger.info(
			{ event: "delete_project_success", projectId: id, userId },
			"Project deleted successfully (soft delete)",
		);

		return { success: true };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "delete_project_error",
				projectId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to delete project",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to delete project.",
		});
	}
}
