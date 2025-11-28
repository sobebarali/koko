import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { videoDetailSelect } from "../constants";
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
		{ event: "get_video_by_id_start", videoId: id, userId },
		"Fetching video by ID",
	);

	try {
		// Fetch video with project owner info
		const results = await db
			.select({
				...videoDetailSelect,
				project: {
					ownerId: project.ownerId,
				},
			})
			.from(video)
			.innerJoin(project, eq(video.projectId, project.id))
			.where(eq(video.id, id))
			.limit(1);

		const result = results[0];

		if (!result) {
			logger.warn(
				{ event: "get_video_by_id_not_found", videoId: id },
				"Video not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Video not found",
			});
		}

		// Check permissions
		const isProjectOwner = result.project.ownerId === userId;
		let isMember = false;

		if (!isProjectOwner) {
			const membership = await db
				.select({ id: projectMember.id })
				.from(projectMember)
				.where(
					and(
						eq(projectMember.projectId, result.projectId),
						eq(projectMember.userId, userId),
					),
				)
				.limit(1);

			isMember = membership.length > 0;
		}

		if (!isProjectOwner && !isMember) {
			logger.warn(
				{ event: "get_video_by_id_forbidden", videoId: id, userId },
				"User is not a member of this project",
			);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You do not have access to this video",
			});
		}

		logger.debug(
			{ event: "get_video_by_id_success", videoId: id, userId },
			"Video fetched successfully",
		);

		// Return video without project info
		const { project: _project, ...videoData } = result;

		return {
			video: {
				...videoData,
				tags: videoData.tags ?? [],
			},
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_video_by_id_error",
				videoId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to fetch video",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to fetch video.",
		});
	}
}
