import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { deleteVideo as deleteBunnyVideo } from "../../../lib/services/bunny-collection-service";
import type { BulkDeleteInput, BulkDeleteOutput } from "./type";

interface VideoWithPermissions {
	id: string;
	projectId: string;
	uploadedBy: string;
	bunnyVideoId: string;
	projectOwnerId: string;
}

export async function bulkDelete({
	userId,
	ids,
	logger,
}: {
	userId: string;
	logger: Logger;
} & BulkDeleteInput): Promise<BulkDeleteOutput> {
	logger.debug(
		{ event: "bulk_delete_start", userId, videoCount: ids.length },
		"Starting bulk video delete",
	);

	const deleted: string[] = [];
	const failed: { id: string; reason: string }[] = [];

	try {
		// 1. Fetch all videos with their project info
		const videos = await db
			.select({
				id: video.id,
				projectId: video.projectId,
				uploadedBy: video.uploadedBy,
				bunnyVideoId: video.bunnyVideoId,
				projectOwnerId: project.ownerId,
			})
			.from(video)
			.innerJoin(project, eq(video.projectId, project.id))
			.where(inArray(video.id, ids));

		// Create a map for quick lookup
		const videoMap = new Map<string, VideoWithPermissions>();
		for (const v of videos) {
			videoMap.set(v.id, v);
		}

		// 2. Check which videos the user can delete
		const projectsToCheck = new Set<string>();
		for (const v of videos) {
			if (v.uploadedBy !== userId && v.projectOwnerId !== userId) {
				projectsToCheck.add(v.projectId);
			}
		}

		// Fetch memberships for projects where user is neither uploader nor owner
		const membershipMap = new Map<string, boolean>();
		if (projectsToCheck.size > 0) {
			const memberships = await db
				.select({
					projectId: projectMember.projectId,
					canDelete: projectMember.canDelete,
				})
				.from(projectMember)
				.where(
					and(
						eq(projectMember.userId, userId),
						inArray(projectMember.projectId, Array.from(projectsToCheck)),
					),
				);

			for (const m of memberships) {
				membershipMap.set(m.projectId, m.canDelete ?? false);
			}
		}

		// 3. Categorize videos by deletability
		const videosToDelete: {
			id: string;
			projectId: string;
			bunnyVideoId: string;
		}[] = [];

		for (const videoId of ids) {
			const videoData = videoMap.get(videoId);

			if (!videoData) {
				failed.push({ id: videoId, reason: "Video not found" });
				continue;
			}

			// Check permissions
			const isUploader = videoData.uploadedBy === userId;
			const isProjectOwner = videoData.projectOwnerId === userId;
			const canDelete = membershipMap.get(videoData.projectId) ?? false;

			if (!isUploader && !isProjectOwner && !canDelete) {
				failed.push({
					id: videoId,
					reason: "You do not have permission to delete this video",
				});
				continue;
			}

			videosToDelete.push({
				id: videoData.id,
				projectId: videoData.projectId,
				bunnyVideoId: videoData.bunnyVideoId,
			});
		}

		// 4. Delete from Bunny and database
		if (videosToDelete.length > 0) {
			// Delete from Bunny first (graceful degradation - log failures but continue)
			for (const videoItem of videosToDelete) {
				const bunnySuccess = await deleteBunnyVideo({
					videoId: videoItem.bunnyVideoId,
				});

				if (!bunnySuccess) {
					logger.error(
						{
							event: "bulk_delete_bunny_failed",
							videoId: videoItem.id,
							bunnyVideoId: videoItem.bunnyVideoId,
						},
						"Failed to delete video from Bunny during bulk delete",
					);
					// Continue with database deletion even if Bunny fails
				}
			}

			// Perform bulk hard delete in a transaction
			await db.transaction(async (tx) => {
				const videoIds = videosToDelete.map((v) => v.id);

				// Hard delete all videos
				await tx.delete(video).where(inArray(video.id, videoIds));

				// Group videos by project for count updates
				const projectCounts = new Map<string, number>();
				for (const v of videosToDelete) {
					const count = projectCounts.get(v.projectId) ?? 0;
					projectCounts.set(v.projectId, count + 1);
				}

				// Decrement video counts for each project
				for (const [projectId, count] of projectCounts) {
					await tx
						.update(project)
						.set({
							videoCount: sql`CASE WHEN ${project.videoCount} >= ${count} THEN ${project.videoCount} - ${count} ELSE 0 END`,
						})
						.where(eq(project.id, projectId));
				}
			});

			// Mark all as deleted
			for (const v of videosToDelete) {
				deleted.push(v.id);
			}
		}

		logger.info(
			{
				event: "bulk_delete_success",
				userId,
				deletedCount: deleted.length,
				failedCount: failed.length,
			},
			"Bulk video delete completed",
		);

		return { deleted, failed };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "bulk_delete_error",
				userId,
				ids,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to bulk delete videos",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to delete videos.",
		});
	}
}
