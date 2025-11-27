import { db } from "@koko/db";
import { project } from "@koko/db/schema/project";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { projectListSelect } from "../constants";
import type { ArchiveProjectOutput } from "./type";

export async function archiveProject({
	userId,
	id,
	logger,
}: {
	userId: string;
	id: string;
	logger: Logger;
}): Promise<ArchiveProjectOutput> {
	logger.debug(
		{ event: "archive_project_start", projectId: id, userId },
		"Archiving project",
	);

	try {
		const existing = await db
			.select({ ownerId: project.ownerId, status: project.status })
			.from(project)
			.where(and(eq(project.id, id), isNull(project.deletedAt)))
			.limit(1);

		if (existing.length === 0) {
			logger.warn(
				{ event: "archive_project_not_found", projectId: id },
				"Project not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Project not found",
			});
		}

		if (existing[0]?.ownerId !== userId) {
			logger.warn(
				{ event: "archive_project_forbidden", projectId: id, userId },
				"User is not the owner of this project",
			);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the project owner can archive this project",
			});
		}

		if (existing[0]?.status === "archived") {
			logger.warn(
				{ event: "archive_project_already_archived", projectId: id },
				"Project is already archived",
			);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Project is already archived",
			});
		}

		const [updated] = await db
			.update(project)
			.set({
				status: "archived",
				archivedAt: new Date(),
			})
			.where(eq(project.id, id))
			.returning(projectListSelect);

		if (!updated) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to archive project.",
			});
		}

		logger.info(
			{ event: "archive_project_success", projectId: id, userId },
			"Project archived successfully",
		);

		return { project: updated };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "archive_project_error",
				projectId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to archive project",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to archive project.",
		});
	}
}
