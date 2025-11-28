import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type { UpdateThumbnailInput, UpdateThumbnailOutput } from "./type";

export async function updateThumbnail({
	userId,
	id,
	imageBase64,
	logger,
}: {
	userId: string;
	logger: Logger;
} & UpdateThumbnailInput): Promise<UpdateThumbnailOutput> {
	logger.debug(
		{ event: "update_thumbnail_start", videoId: id, userId },
		"Updating video thumbnail",
	);

	try {
		// 1. Validate environment variables
		const apiKey = process.env.BUNNY_API_KEY;
		const libraryId = process.env.BUNNY_LIBRARY_ID;
		const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;

		if (!apiKey || !libraryId) {
			logger.error(
				{ event: "update_thumbnail_config_missing", userId },
				"Bunny Stream API is not configured",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Video service is not configured.",
			});
		}

		// 2. Fetch video with project info
		const videos = await db
			.select({
				id: video.id,
				bunnyVideoId: video.bunnyVideoId,
				projectId: video.projectId,
				uploadedBy: video.uploadedBy,
				status: video.status,
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
				{ event: "update_thumbnail_not_found", videoId: id },
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

		// 3. Check if video is ready
		if (videoData.status !== "ready") {
			logger.warn(
				{
					event: "update_thumbnail_not_ready",
					videoId: id,
					status: videoData.status,
				},
				"Video is not ready for thumbnail update",
			);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Video must be ready before updating thumbnail",
			});
		}

		// 4. Check permissions (uploader OR project owner can update thumbnail)
		const isUploader = videoData.uploadedBy === userId;
		const isProjectOwner = videoData.project.ownerId === userId;

		if (!isUploader && !isProjectOwner) {
			const membership = await db
				.select({ id: projectMember.id })
				.from(projectMember)
				.where(
					and(
						eq(projectMember.projectId, videoData.projectId),
						eq(projectMember.userId, userId),
					),
				)
				.limit(1);

			if (membership.length === 0) {
				logger.warn(
					{ event: "update_thumbnail_forbidden", videoId: id, userId },
					"User does not have permission to update thumbnail",
				);
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have permission to update this video",
				});
			}
		}

		// 5. Upload thumbnail image to Bunny
		const imageBuffer = Buffer.from(imageBase64, "base64");
		const bunnyResponse = await fetch(
			`https://video.bunnycdn.com/library/${libraryId}/videos/${videoData.bunnyVideoId}/thumbnail`,
			{
				method: "POST",
				headers: {
					AccessKey: apiKey,
					"Content-Type": "image/jpeg",
					Accept: "application/json",
				},
				body: imageBuffer,
			},
		);

		if (!bunnyResponse.ok) {
			logger.error(
				{
					event: "update_thumbnail_bunny_error",
					status: bunnyResponse.status,
					videoId: id,
				},
				"Failed to update thumbnail on Bunny",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to update video thumbnail.",
			});
		}

		// 6. Construct new thumbnail URL and update database
		const thumbnailFileName = "thumbnail.jpg";
		const cacheBuster = Date.now();
		const thumbnailUrl = cdnHostname
			? `https://${cdnHostname}/${videoData.bunnyVideoId}/${thumbnailFileName}?v=${cacheBuster}`
			: null;

		if (thumbnailUrl) {
			await db.update(video).set({ thumbnailUrl }).where(eq(video.id, id));
		}

		logger.info(
			{
				event: "update_thumbnail_success",
				videoId: id,
				thumbnailUrl,
			},
			"Video thumbnail updated successfully",
		);

		return {
			success: true,
			thumbnailUrl,
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "update_thumbnail_error",
				videoId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to update video thumbnail",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update video thumbnail.",
		});
	}
}
