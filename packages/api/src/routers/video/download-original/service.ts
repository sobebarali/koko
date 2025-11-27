import { createHash } from "node:crypto";
import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type { DownloadOriginalInput, DownloadOriginalOutput } from "./type";

export async function downloadOriginal({
	userId,
	id,
	expiresIn = 3600,
	logger,
}: {
	userId: string;
	logger: Logger;
} & DownloadOriginalInput): Promise<DownloadOriginalOutput> {
	logger.debug(
		{ event: "download_original_start", videoId: id, userId, expiresIn },
		"Generating download URL for original video",
	);

	try {
		// 1. Validate environment variables
		const apiKey = process.env.BUNNY_API_KEY;
		const libraryId = process.env.BUNNY_LIBRARY_ID;
		const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;

		if (!apiKey || !libraryId) {
			logger.error(
				{ event: "download_original_config_missing", userId },
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
				deletedAt: video.deletedAt,
				originalFileName: video.originalFileName,
				project: {
					ownerId: project.ownerId,
				},
			})
			.from(video)
			.innerJoin(project, eq(video.projectId, project.id))
			.where(and(eq(video.id, id), isNull(video.deletedAt)))
			.limit(1);

		if (videos.length === 0) {
			logger.warn(
				{ event: "download_original_not_found", videoId: id },
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
					event: "download_original_not_ready",
					videoId: id,
					status: videoData.status,
				},
				"Video is not ready for download",
			);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Video is not ready for download",
			});
		}

		// 4. Check permissions (owner, uploader, or project member)
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
					{ event: "download_original_forbidden", videoId: id, userId },
					"User does not have access to this video",
				);
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have access to this video",
				});
			}
		}

		// 5. Generate signed download URL
		const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;
		const expiresAt = new Date(expirationTime * 1000).toISOString();

		// Bunny signed URL format for video downloads
		// The signature is SHA256(libraryId + apiKey + expirationTime + videoGuid)
		const signatureData = `${libraryId}${apiKey}${expirationTime}${videoData.bunnyVideoId}`;
		const signature = createHash("sha256").update(signatureData).digest("hex");

		// Construct the download URL
		// Format: https://{cdnHostname}/{videoGuid}/original?token={signature}&expires={expirationTime}
		const baseUrl = cdnHostname
			? `https://${cdnHostname}`
			: `https://video.bunnycdn.com/library/${libraryId}/videos`;

		const downloadUrl = cdnHostname
			? `${baseUrl}/${videoData.bunnyVideoId}/original?token=${signature}&expires=${expirationTime}`
			: `${baseUrl}/${videoData.bunnyVideoId}?token=${signature}&expires=${expirationTime}`;

		logger.info(
			{
				event: "download_original_success",
				videoId: id,
				expiresAt,
			},
			"Download URL generated successfully",
		);

		return {
			downloadUrl,
			expiresAt,
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "download_original_error",
				videoId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to generate download URL",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to generate download URL.",
		});
	}
}
