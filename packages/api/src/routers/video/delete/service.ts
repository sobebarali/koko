import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { deleteVideo as deleteBunnyVideo } from "../../../lib/services/bunny-collection-service";
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
		"Deleting video (hard delete)",
	);

	try {
		// 1. Fetch video with project info and bunnyVideoId
		const videos = await db
			.select({
				id: video.id,
				projectId: video.projectId,
				uploadedBy: video.uploadedBy,
				bunnyVideoId: video.bunnyVideoId,
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

		// 2. Check permissions (uploader OR project owner can delete)
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

		// 3. Delete video from Bunny first (fail-fast if this fails)
		const bunnyDeleteSuccess = await deleteBunnyVideo({
			videoId: videoData.bunnyVideoId,
		});

		if (!bunnyDeleteSuccess) {
			logger.error(
				{
					event: "delete_video_bunny_failed",
					videoId: id,
					bunnyVideoId: videoData.bunnyVideoId,
				},
				"Failed to delete video from Bunny",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to delete video from storage. Please try again.",
			});
		}

		// 4. Hard delete from database and decrement counter in a transaction
		await db.transaction(async (tx) => {
			// Delete video from database
			await tx.delete(video).where(eq(video.id, id));

			// Decrement project video count atomically
			await tx
				.update(project)
				.set({
					videoCount: sql`CASE WHEN ${project.videoCount} > 0 THEN ${project.videoCount} - 1 ELSE 0 END`,
				})
				.where(eq(project.id, videoData.projectId));
		});

		logger.info(
			{ event: "delete_video_success", videoId: id, userId },
			"Video deleted successfully (hard delete)",
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
