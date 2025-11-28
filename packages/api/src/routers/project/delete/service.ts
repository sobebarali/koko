import { db } from "@koko/db";
import { project } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import {
	deleteCollection,
	deleteVideo,
} from "../../../lib/services/bunny-collection-service";
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
		"Deleting project (hard delete)",
	);

	try {
		// 1. Fetch project with videos
		const existing = await db.query.project.findFirst({
			where: eq(project.id, id),
			columns: {
				ownerId: true,
				bunnyCollectionId: true,
			},
			with: {
				videos: {
					columns: {
						id: true,
						bunnyVideoId: true,
					},
				},
			},
		});

		if (!existing) {
			logger.warn(
				{ event: "delete_project_not_found", projectId: id },
				"Project not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Project not found",
			});
		}

		if (existing.ownerId !== userId) {
			logger.warn(
				{ event: "delete_project_forbidden", projectId: id, userId },
				"User is not the owner of this project",
			);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the project owner can delete this project",
			});
		}

		// 2. Delete all videos from Bunny first (graceful degradation)
		if (existing.videos && existing.videos.length > 0) {
			logger.debug(
				{
					event: "delete_project_videos_start",
					projectId: id,
					count: existing.videos.length,
				},
				"Deleting videos from Bunny",
			);

			for (const videoItem of existing.videos) {
				const success = await deleteVideo({ videoId: videoItem.bunnyVideoId });
				if (!success) {
					logger.error(
						{
							event: "delete_video_failed",
							projectId: id,
							videoId: videoItem.id,
							bunnyVideoId: videoItem.bunnyVideoId,
						},
						"Failed to delete video from Bunny, continuing with deletion",
					);
					// Continue with deletion even if some videos fail
				}
			}
		}

		// 3. Delete Bunny Collection (fail-fast if this fails)
		if (existing.bunnyCollectionId) {
			logger.debug(
				{
					event: "delete_collection_start",
					projectId: id,
					collectionId: existing.bunnyCollectionId,
				},
				"Deleting Bunny Collection",
			);

			const success = await deleteCollection({
				collectionId: existing.bunnyCollectionId,
			});

			if (!success) {
				logger.error(
					{
						event: "delete_collection_failed",
						projectId: id,
						collectionId: existing.bunnyCollectionId,
					},
					"Failed to delete Bunny Collection",
				);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to delete video collection. Please try again.",
				});
			}
		}

		// 4. Delete all videos from database (cascade handled by foreign key)
		if (existing.videos && existing.videos.length > 0) {
			await db.delete(video).where(eq(video.projectId, id));
			logger.debug(
				{
					event: "delete_videos_db_success",
					projectId: id,
					count: existing.videos.length,
				},
				"Deleted videos from database",
			);
		}

		// 5. Delete project from database
		await db.delete(project).where(eq(project.id, id));

		logger.info(
			{ event: "delete_project_success", projectId: id, userId },
			"Project hard deleted successfully",
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
