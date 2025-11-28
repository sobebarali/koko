import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type {
	GetProcessingStatusInput,
	GetProcessingStatusOutput,
} from "./type";

/**
 * Bunny video status codes
 */
const BunnyStatus = {
	QUEUED: 0,
	PROCESSING_PREVIEW: 1,
	ENCODING: 2,
	FINISHED: 3,
	RESOLUTION_FINISHED: 4,
	FAILED: 5,
	PRESIGNED_UPLOAD_STARTED: 6,
	PRESIGNED_UPLOAD_FINISHED: 7,
	PRESIGNED_UPLOAD_FAILED: 8,
	CAPTIONS_GENERATED: 9,
	TITLE_DESCRIPTION_GENERATED: 10,
} as const;

interface BunnyVideoResponse {
	guid: string;
	status: number;
	encodeProgress: number;
	length: number;
	width: number;
	height: number;
	transcodingMessages: {
		timeStamp: string;
		level: number;
		issueCode: number;
		message: string;
	}[];
}

function mapBunnyStatus(
	bunnyStatus: number,
): "uploading" | "processing" | "ready" | "failed" {
	switch (bunnyStatus) {
		case BunnyStatus.QUEUED:
		case BunnyStatus.PROCESSING_PREVIEW:
		case BunnyStatus.ENCODING:
			return "processing";
		case BunnyStatus.FINISHED:
		case BunnyStatus.RESOLUTION_FINISHED:
			return "ready";
		case BunnyStatus.FAILED:
		case BunnyStatus.PRESIGNED_UPLOAD_FAILED:
			return "failed";
		case BunnyStatus.PRESIGNED_UPLOAD_STARTED:
			return "uploading";
		default:
			return "processing";
	}
}

export async function getProcessingStatus({
	userId,
	id,
	logger,
}: {
	userId: string;
	logger: Logger;
} & GetProcessingStatusInput): Promise<GetProcessingStatusOutput> {
	logger.debug(
		{ event: "get_processing_status_start", videoId: id, userId },
		"Fetching video processing status",
	);

	try {
		// 1. Validate environment variables
		const apiKey = process.env.BUNNY_API_KEY;
		const libraryId = process.env.BUNNY_LIBRARY_ID;
		if (!apiKey || !libraryId) {
			logger.error(
				{ event: "get_processing_status_config_missing", userId },
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
				{ event: "get_processing_status_not_found", videoId: id },
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

		// 3. Check permissions (owner, uploader, or project member)
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
					{ event: "get_processing_status_forbidden", videoId: id, userId },
					"User does not have access to this video",
				);
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have access to this video",
				});
			}
		}

		// 4. Fetch real-time status from Bunny API
		const bunnyResponse = await fetch(
			`https://video.bunnycdn.com/library/${libraryId}/videos/${videoData.bunnyVideoId}`,
			{
				method: "GET",
				headers: {
					AccessKey: apiKey,
					Accept: "application/json",
				},
			},
		);

		if (!bunnyResponse.ok) {
			logger.error(
				{
					event: "get_processing_status_bunny_error",
					status: bunnyResponse.status,
					videoId: id,
					bunnyVideoId: videoData.bunnyVideoId,
				},
				"Failed to fetch status from Bunny API",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to fetch video status.",
			});
		}

		const bunnyData = (await bunnyResponse.json()) as BunnyVideoResponse;

		// 5. Map Bunny response to our output format
		const status = mapBunnyStatus(bunnyData.status);
		const errorMessage =
			status === "failed"
				? (bunnyData.transcodingMessages?.[0]?.message ??
					"Video processing failed")
				: null;

		const resolution =
			bunnyData.width > 0 && bunnyData.height > 0
				? `${bunnyData.width}x${bunnyData.height}`
				: null;

		const duration = bunnyData.length > 0 ? Math.round(bunnyData.length) : null;
		const progress =
			status === "processing" ? Math.round(bunnyData.encodeProgress) : null;

		logger.info(
			{
				event: "get_processing_status_success",
				videoId: id,
				status,
				progress,
			},
			"Video processing status retrieved",
		);

		return {
			status,
			progress,
			errorMessage,
			resolution,
			duration,
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_processing_status_error",
				videoId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to get video processing status",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to get video processing status.",
		});
	}
}
