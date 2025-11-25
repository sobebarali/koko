import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { videoListSelect } from "../constants";
import type { GetAllInput, GetAllOutput } from "./type";

export async function getAll({
	userId,
	projectId,
	status,
	limit,
	cursor,
	logger,
}: {
	userId: string;
	logger: Logger;
} & GetAllInput): Promise<GetAllOutput> {
	logger.debug(
		{ event: "get_all_videos_start", userId, projectId, status, limit, cursor },
		"Fetching videos for project",
	);

	try {
		// 1. Verify project exists
		const projects = await db
			.select({ id: project.id, ownerId: project.ownerId })
			.from(project)
			.where(eq(project.id, projectId))
			.limit(1);

		if (projects.length === 0) {
			logger.warn(
				{ event: "get_all_videos_project_not_found", projectId },
				"Project not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Project not found",
			});
		}

		const projectData = projects[0];
		if (!projectData) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to retrieve project data.",
			});
		}

		// 2. Check project membership
		const isOwner = projectData.ownerId === userId;
		if (!isOwner) {
			const membership = await db
				.select({ id: projectMember.id })
				.from(projectMember)
				.where(
					and(
						eq(projectMember.projectId, projectId),
						eq(projectMember.userId, userId),
					),
				)
				.limit(1);

			if (membership.length === 0) {
				logger.warn(
					{ event: "get_all_videos_forbidden", projectId, userId },
					"User is not a member of this project",
				);
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have access to this project",
				});
			}
		}

		// 3. Build query conditions
		const conditions = [
			eq(video.projectId, projectId),
			isNull(video.deletedAt),
		];

		if (status) {
			conditions.push(eq(video.status, status));
		}

		if (cursor) {
			const cursorDate = new Date(cursor);
			conditions.push(lt(video.createdAt, cursorDate));
		}

		// 4. Fetch videos
		const videos = await db
			.select(videoListSelect)
			.from(video)
			.where(and(...conditions))
			.orderBy(desc(video.createdAt))
			.limit(limit + 1);

		// 5. Calculate pagination
		const hasMore = videos.length > limit;
		const items = hasMore ? videos.slice(0, limit) : videos;
		const nextCursor = hasMore
			? items[items.length - 1]?.createdAt.toISOString()
			: undefined;

		logger.debug(
			{
				event: "get_all_videos_success",
				userId,
				projectId,
				count: items.length,
				hasMore,
			},
			"Videos fetched successfully",
		);

		return { videos: items, nextCursor };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_all_videos_error",
				userId,
				projectId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to fetch videos",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to fetch videos.",
		});
	}
}
