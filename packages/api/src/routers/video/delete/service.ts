import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type { DeleteOutput } from "./type";

export async function deleteVideo({
	userId,
	id,
	logger,
}: {
	userId: string;
	id: string;
	logger: Logger;
}): Promise<DeleteOutput> {
	logger.debug(
		{ event: "delete_video_start", videoId: id, userId },
		"Deleting video (soft delete)",
	);

	try {
		// 1. Fetch video with project info
		const videos = await db
			.select({
				id: video.id,
				projectId: video.projectId,
				uploadedBy: video.uploadedBy,
				deletedAt: video.deletedAt,
				project: {
					ownerId: project.ownerId,
				},
			})
			.from(video)
			.innerJoin(project, eq(video.projectId, project.id))
			.where(eq(video.id, id))
			.limit(1);

		if (videos.length === 0) {
			logger.warn(
				{ event: "delete_video_not_found", videoId: id },
				"Video not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Video not found",
			});
		}

		const videoData = videos[0];
		if (!videoData) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to retrieve video data.",
			});
		}

		// 2. Check if already deleted
		if (videoData.deletedAt !== null) {
			logger.warn(
				{ event: "delete_video_already_deleted", videoId: id },
				"Video is already deleted",
			);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Video is already deleted",
			});
		}

		// 3. Check permissions (uploader OR project owner can delete)
		const isUploader = videoData.uploadedBy === userId;
		const isProjectOwner = videoData.project.ownerId === userId;

		if (!isUploader && !isProjectOwner) {
			// Check if user has delete permission
			const membership = await db
				.select({ canDelete: projectMember.canDelete })
				.from(projectMember)
				.where(
					and(
						eq(projectMember.projectId, videoData.projectId),
						eq(projectMember.userId, userId),
					),
				)
				.limit(1);

			const memberData = membership[0];
			if (!memberData || !memberData.canDelete) {
				logger.warn(
					{ event: "delete_video_forbidden", videoId: id, userId },
					"User does not have permission to delete this video",
				);
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have permission to delete this video",
				});
			}
		}

		// 4. Soft delete
		await db
			.update(video)
			.set({ deletedAt: new Date() })
			.where(eq(video.id, id));

		// 5. Decrement project video count
		await db
			.update(project)
			.set({ videoCount: sql`MAX(${project.videoCount} - 1, 0)` })
			.where(eq(project.id, videoData.projectId));

		logger.info(
			{ event: "delete_video_success", videoId: id, userId },
			"Video deleted successfully (soft delete)",
		);

		return { success: true };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "delete_video_error",
				videoId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to delete video",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to delete video.",
		});
	}
}
