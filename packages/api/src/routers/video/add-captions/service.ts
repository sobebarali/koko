import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type { AddCaptionsInput, AddCaptionsOutput } from "./type";

/**
 * Add captions to a video via manual file upload
 *
 * Supports VTT and SRT caption file formats.
 * For AI transcription, use video.transcribe (future implementation)
 *
 * @see https://docs.bunny.net/reference/video_addcaption
 */
export async function addCaptions({
	userId,
	id,
	srclang,
	label,
	captionFile,
	logger,
}: {
	userId: string;
	logger: Logger;
} & AddCaptionsInput): Promise<AddCaptionsOutput> {
	logger.debug(
		{
			event: "add_captions_start",
			videoId: id,
			userId,
			srclang,
			label,
		},
		"Adding captions to video",
	);

	try {
		// 1. Validate environment variables
		const apiKey = process.env.BUNNY_API_KEY;
		const libraryId = process.env.BUNNY_LIBRARY_ID;

		if (!apiKey || !libraryId) {
			logger.error(
				{ event: "add_captions_config_missing", userId },
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
				{ event: "add_captions_not_found", videoId: id },
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
					event: "add_captions_not_ready",
					videoId: id,
					status: videoData.status,
				},
				"Video is not ready for captions",
			);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Video must be ready before adding captions",
			});
		}

		// 4. Check permissions (uploader OR project owner OR project member)
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
					{ event: "add_captions_forbidden", videoId: id, userId },
					"User does not have permission to add captions",
				);
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have permission to modify this video",
				});
			}
		}

		// 5. Decode and upload caption file to Bunny
		const captionContent = Buffer.from(captionFile, "base64").toString("utf-8");
		const captionLabel = label || srclang.toUpperCase();

		const bunnyResponse = await fetch(
			`https://video.bunnycdn.com/library/${libraryId}/videos/${videoData.bunnyVideoId}/captions/${srclang}`,
			{
				method: "POST",
				headers: {
					AccessKey: apiKey,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					srclang,
					label: captionLabel,
					captionsFile: captionContent,
				}),
			},
		);

		if (!bunnyResponse.ok) {
			const errorText = await bunnyResponse.text();
			logger.error(
				{
					event: "add_captions_bunny_error",
					status: bunnyResponse.status,
					videoId: id,
					error: errorText,
				},
				"Failed to add captions via Bunny API",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to upload captions.",
			});
		}

		const successMessage = `Captions (${captionLabel}) uploaded successfully`;

		logger.info(
			{
				event: "add_captions_success",
				videoId: id,
				srclang,
				label: captionLabel,
			},
			successMessage,
		);

		return {
			success: true,
			message: successMessage,
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "add_captions_error",
				videoId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to add captions to video",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to add captions to video.",
		});
	}
}
