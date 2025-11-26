import { db } from "@koko/db";
import { video } from "@koko/db/schema/video";
import { eq } from "drizzle-orm";
import type { Logger } from "../lib/logger/types";

/**
 * Bunny Stream Webhook Status Codes
 * @see https://docs.bunny.net/docs/stream-webhook
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

/**
 * Bunny webhook payload structure
 */
interface BunnyWebhookPayload {
	VideoLibraryId: number;
	VideoGuid: string;
	Status: number;
}

/**
 * Bunny video metadata from API
 */
interface BunnyVideoMetadata {
	guid: string;
	title: string;
	dateUploaded: string;
	views: number;
	isPublic: boolean;
	length: number;
	status: number;
	framerate: number;
	width: number;
	height: number;
	availableResolutions: string;
	thumbnailCount: number;
	encodeProgress: number;
	storageSize: number;
	captions: { srclang: string; label: string }[];
	hasMP4Fallback: boolean;
	collectionId: string;
	thumbnailFileName: string;
	averageWatchTime: number;
	totalWatchTime: number;
	category: string;
	chapters: unknown[];
	moments: unknown[];
	metaTags: { property: string; value: string }[];
	transcodingMessages: {
		timeStamp: string;
		level: number;
		issueCode: number;
		message: string;
	}[];
}

/**
 * Fetch video metadata from Bunny Stream API
 */
async function fetchBunnyVideoMetadata({
	videoGuid,
	libraryId,
	apiKey,
	logger,
}: {
	videoGuid: string;
	libraryId: string;
	apiKey: string;
	logger: Logger;
}): Promise<BunnyVideoMetadata | null> {
	try {
		const response = await fetch(
			`https://video.bunnycdn.com/library/${libraryId}/videos/${videoGuid}`,
			{
				method: "GET",
				headers: {
					AccessKey: apiKey,
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			logger.error(
				{
					event: "bunny_fetch_metadata_error",
					status: response.status,
					videoGuid,
				},
				"Failed to fetch video metadata from Bunny",
			);
			return null;
		}

		return (await response.json()) as BunnyVideoMetadata;
	} catch (error) {
		logger.error(
			{
				event: "bunny_fetch_metadata_exception",
				videoGuid,
				error: error instanceof Error ? error.message : error,
			},
			"Exception fetching video metadata from Bunny",
		);
		return null;
	}
}

/**
 * Process Bunny Stream webhook event
 */
export async function handleBunnyWebhook({
	payload,
	logger,
}: {
	payload: BunnyWebhookPayload;
	logger: Logger;
}): Promise<{ success: boolean; message: string }> {
	const { VideoLibraryId, VideoGuid, Status } = payload;

	logger.info(
		{
			event: "bunny_webhook_received",
			videoGuid: VideoGuid,
			status: Status,
			libraryId: VideoLibraryId,
		},
		"Received Bunny webhook",
	);

	// Validate environment
	const apiKey = process.env.BUNNY_API_KEY;
	const libraryId = process.env.BUNNY_LIBRARY_ID;
	const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;

	if (!apiKey || !libraryId) {
		logger.error(
			{ event: "bunny_webhook_config_missing" },
			"Bunny API not configured",
		);
		return { success: false, message: "Bunny API not configured" };
	}

	// Verify library ID matches
	if (String(VideoLibraryId) !== libraryId) {
		logger.warn(
			{
				event: "bunny_webhook_library_mismatch",
				expected: libraryId,
				received: VideoLibraryId,
			},
			"Library ID mismatch",
		);
		return { success: false, message: "Library ID mismatch" };
	}

	// Find video in database
	const videos = await db
		.select({ id: video.id, status: video.status })
		.from(video)
		.where(eq(video.bunnyVideoId, VideoGuid))
		.limit(1);

	if (videos.length === 0) {
		logger.warn(
			{ event: "bunny_webhook_video_not_found", videoGuid: VideoGuid },
			"Video not found in database",
		);
		return { success: false, message: "Video not found" };
	}

	const existingVideo = videos[0];
	if (!existingVideo) {
		return { success: false, message: "Video not found" };
	}

	// Handle status updates
	switch (Status) {
		case BunnyStatus.QUEUED:
		case BunnyStatus.PROCESSING_PREVIEW:
		case BunnyStatus.ENCODING: {
			// Update to processing status
			await db
				.update(video)
				.set({ status: "processing" })
				.where(eq(video.bunnyVideoId, VideoGuid));

			logger.info(
				{
					event: "bunny_webhook_processing",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
				},
				"Video is processing",
			);
			return { success: true, message: "Video status updated to processing" };
		}

		case BunnyStatus.RESOLUTION_FINISHED:
		case BunnyStatus.FINISHED: {
			// Fetch metadata from Bunny API
			const metadata = await fetchBunnyVideoMetadata({
				videoGuid: VideoGuid,
				libraryId,
				apiKey,
				logger,
			});

			const updateData: {
				status: "ready";
				duration?: number;
				width?: number;
				height?: number;
				fps?: number;
				thumbnailUrl?: string;
				streamingUrl?: string;
			} = { status: "ready" };

			if (metadata) {
				updateData.duration = Math.round(metadata.length);
				updateData.width = metadata.width;
				updateData.height = metadata.height;
				updateData.fps = Math.round(metadata.framerate);
				if (cdnHostname) {
					updateData.thumbnailUrl = `https://${cdnHostname}/${VideoGuid}/${metadata.thumbnailFileName || "thumbnail.jpg"}`;
				}
				updateData.streamingUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${VideoGuid}`;
			}

			await db
				.update(video)
				.set(updateData)
				.where(eq(video.bunnyVideoId, VideoGuid));

			logger.info(
				{
					event: "bunny_webhook_ready",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
					duration: updateData.duration,
					resolution: metadata
						? `${metadata.width}x${metadata.height}`
						: "unknown",
				},
				"Video is ready",
			);
			return { success: true, message: "Video is ready" };
		}

		case BunnyStatus.FAILED:
		case BunnyStatus.PRESIGNED_UPLOAD_FAILED: {
			await db
				.update(video)
				.set({
					status: "failed",
					errorMessage: "Video encoding failed",
				})
				.where(eq(video.bunnyVideoId, VideoGuid));

			logger.error(
				{
					event: "bunny_webhook_failed",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
				},
				"Video encoding failed",
			);
			return { success: true, message: "Video marked as failed" };
		}

		default: {
			logger.debug(
				{
					event: "bunny_webhook_ignored",
					videoGuid: VideoGuid,
					status: Status,
				},
				"Ignoring webhook status",
			);
			return { success: true, message: "Webhook status ignored" };
		}
	}
}

/**
 * Validate Bunny webhook payload
 */
export function validateBunnyWebhookPayload(
	body: unknown,
): body is BunnyWebhookPayload {
	if (!body || typeof body !== "object") return false;
	const payload = body as Record<string, unknown>;
	return (
		typeof payload.VideoLibraryId === "number" &&
		typeof payload.VideoGuid === "string" &&
		typeof payload.Status === "number"
	);
}
