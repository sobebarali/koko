import { db } from "@koko/db";
import { project } from "@koko/db/schema/project";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { projectListSelect } from "../constants";
import type { RestoreProjectOutput } from "./type";

export async function restoreProject({
	userId,
	id,
	logger,
}: {
	userId: string;
	id: string;
	logger: Logger;
}): Promise<RestoreProjectOutput> {
	logger.debug(
		{ event: "restore_project_start", projectId: id, userId },
		"Restoring project",
	);

	try {
		const existing = await db
			.select({ ownerId: project.ownerId, status: project.status })
			.from(project)
			.where(eq(project.id, id))
			.limit(1);

		if (existing.length === 0) {
			logger.warn(
				{ event: "restore_project_not_found", projectId: id },
				"Project not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Project not found",
			});
		}

		if (existing[0]?.ownerId !== userId) {
			logger.warn(
				{ event: "restore_project_forbidden", projectId: id, userId },
				"User is not the owner of this project",
			);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the project owner can restore this project",
			});
		}

		if (existing[0]?.status !== "archived") {
			logger.warn(
				{ event: "restore_project_not_archived", projectId: id },
				"Project is not archived",
			);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Project is not archived",
			});
		}

		const [updated] = await db
			.update(project)
			.set({
				status: "active",
			})
			.where(eq(project.id, id))
			.returning(projectListSelect);

		if (!updated) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to restore project.",
			});
		}

		logger.info(
			{ event: "restore_project_success", projectId: id, userId },
			"Project restored successfully",
		);

		return { project: updated };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "restore_project_error",
				projectId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to restore project",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to restore project.",
		});
	}
}
