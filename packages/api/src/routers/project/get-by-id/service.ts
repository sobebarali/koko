import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { project, projectMember } from "@koko/db/schema/project";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { projectDetailSelect } from "../constants";
import type { GetByIdOutput } from "./type";

export async function getById({
	id,
	userId,
	logger,
}: {
	id: string;
	userId: string;
	logger: Logger;
}): Promise<GetByIdOutput> {
	logger.debug(
		{ event: "get_project_by_id_start", projectId: id, userId },
		"Fetching project by ID",
	);

	try {
		const results = await db
			.select({
				...projectDetailSelect,
				owner: {
					id: user.id,
					name: user.name,
					image: user.image,
				},
			})
			.from(project)
			.innerJoin(user, eq(project.ownerId, user.id))
			.where(eq(project.id, id))
			.limit(1);

		const result = results[0];

		if (!result) {
			logger.warn(
				{ event: "get_project_by_id_not_found", projectId: id },
				"Project not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Project not found",
			});
		}

		const isOwner = result.ownerId === userId;
		let isMember = false;

		if (!isOwner) {
			const membership = await db
				.select({ id: projectMember.id })
				.from(projectMember)
				.where(
					and(
						eq(projectMember.projectId, id),
						eq(projectMember.userId, userId),
					),
				)
				.limit(1);

			isMember = membership.length > 0;
		}

		if (!isOwner && !isMember) {
			logger.warn(
				{ event: "get_project_by_id_forbidden", projectId: id, userId },
				"User is not a member of this project",
			);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You do not have access to this project",
			});
		}

		logger.debug(
			{ event: "get_project_by_id_success", projectId: id, userId },
			"Project fetched successfully",
		);

		return { project: result };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_project_by_id_error",
				projectId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to fetch project",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to fetch project.",
		});
	}
}
