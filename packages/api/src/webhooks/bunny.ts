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
 * Get human-readable status name for logging
 */
function getStatusName(status: number): string {
	const names: Record<number, string> = {
		0: "QUEUED",
		1: "PROCESSING_PREVIEW",
		2: "ENCODING",
		3: "FINISHED",
		4: "RESOLUTION_FINISHED",
		5: "FAILED",
		6: "PRESIGNED_UPLOAD_STARTED",
		7: "PRESIGNED_UPLOAD_FINISHED",
		8: "PRESIGNED_UPLOAD_FAILED",
		9: "CAPTIONS_GENERATED",
		10: "TITLE_DESCRIPTION_GENERATED",
	};
	return names[status] ?? `UNKNOWN(${status})`;
}

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
	const url = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoGuid}`;
	const startTime = Date.now();

	logger.info(
		{
			event: "bunny_fetch_metadata_start",
			videoGuid,
			libraryId,
			url,
		},
		"Fetching video metadata from Bunny API",
	);

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				AccessKey: apiKey,
				Accept: "application/json",
			},
		});

		const duration = Date.now() - startTime;

		if (!response.ok) {
			const responseText = await response.text();
			logger.error(
				{
					event: "bunny_fetch_metadata_error",
					status: response.status,
					statusText: response.statusText,
					videoGuid,
					libraryId,
					responseBody: responseText,
					durationMs: duration,
				},
				"Failed to fetch video metadata from Bunny",
			);
			return null;
		}

		const metadata = (await response.json()) as BunnyVideoMetadata;

		logger.info(
			{
				event: "bunny_fetch_metadata_success",
				videoGuid,
				durationMs: duration,
				metadata: {
					guid: metadata.guid,
					title: metadata.title,
					status: metadata.status,
					statusName: getStatusName(metadata.status),
					length: metadata.length,
					width: metadata.width,
					height: metadata.height,
					framerate: metadata.framerate,
					encodeProgress: metadata.encodeProgress,
					thumbnailFileName: metadata.thumbnailFileName,
					transcodingMessagesCount: metadata.transcodingMessages?.length ?? 0,
				},
			},
			"Successfully fetched video metadata from Bunny",
		);

		return metadata;
	} catch (error) {
		const duration = Date.now() - startTime;
		logger.error(
			{
				event: "bunny_fetch_metadata_exception",
				videoGuid,
				libraryId,
				error: error instanceof Error ? error.message : error,
				stack: error instanceof Error ? error.stack : undefined,
				durationMs: duration,
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
	const statusName = getStatusName(Status);

	logger.info(
		{
			event: "bunny_webhook_handler_start",
			videoGuid: VideoGuid,
			status: Status,
			statusName,
			libraryId: VideoLibraryId,
		},
		`Processing Bunny webhook: ${statusName}`,
	);

	// Validate environment
	const apiKey = process.env.BUNNY_API_KEY;
	const libraryId = process.env.BUNNY_LIBRARY_ID;
	const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;

	logger.debug(
		{
			event: "bunny_webhook_env_check",
			hasApiKey: !!apiKey,
			hasLibraryId: !!libraryId,
			hasCdnHostname: !!cdnHostname,
			configuredLibraryId: libraryId,
			cdnHostname: cdnHostname,
		},
		"Environment configuration check",
	);

	if (!apiKey || !libraryId) {
		logger.error(
			{
				event: "bunny_webhook_config_missing",
				hasApiKey: !!apiKey,
				hasLibraryId: !!libraryId,
			},
			"Bunny API not configured - missing required environment variables",
		);
		return { success: false, message: "Bunny API not configured" };
	}

	// Verify library ID matches
	if (String(VideoLibraryId) !== libraryId) {
		logger.warn(
			{
				event: "bunny_webhook_library_mismatch",
				expectedLibraryId: libraryId,
				receivedLibraryId: VideoLibraryId,
				receivedLibraryIdType: typeof VideoLibraryId,
			},
			"Library ID mismatch - webhook from different library",
		);
		return { success: false, message: "Library ID mismatch" };
	}

	logger.debug(
		{
			event: "bunny_webhook_library_verified",
			libraryId,
		},
		"Library ID verified",
	);

	// Find video in database
	logger.debug(
		{
			event: "bunny_webhook_db_query_start",
			videoGuid: VideoGuid,
		},
		"Querying database for video by bunnyVideoId",
	);

	const dbQueryStart = Date.now();
	const videos = await db
		.select({ id: video.id, status: video.status })
		.from(video)
		.where(eq(video.bunnyVideoId, VideoGuid))
		.limit(1);
	const dbQueryDuration = Date.now() - dbQueryStart;

	logger.debug(
		{
			event: "bunny_webhook_db_query_result",
			videoGuid: VideoGuid,
			foundCount: videos.length,
			durationMs: dbQueryDuration,
			foundVideo: videos[0]
				? { id: videos[0].id, status: videos[0].status }
				: null,
		},
		`Database query completed: found ${videos.length} video(s)`,
	);

	if (videos.length === 0) {
		logger.warn(
			{
				event: "bunny_webhook_video_not_found",
				videoGuid: VideoGuid,
				status: Status,
				statusName,
			},
			"Video not found in database - webhook for unknown video",
		);
		return { success: false, message: "Video not found" };
	}

	const existingVideo = videos[0];
	if (!existingVideo) {
		return { success: false, message: "Video not found" };
	}

	logger.info(
		{
			event: "bunny_webhook_video_found",
			videoId: existingVideo.id,
			videoGuid: VideoGuid,
			currentDbStatus: existingVideo.status,
			incomingBunnyStatus: Status,
			incomingBunnyStatusName: statusName,
		},
		`Found video in database: current status=${existingVideo.status}, incoming=${statusName}`,
	);

	// Skip updates for videos already in final states (idempotency)
	if (existingVideo.status === "ready" || existingVideo.status === "failed") {
		logger.info(
			{
				event: "bunny_webhook_final_state_skip",
				videoId: existingVideo.id,
				currentStatus: existingVideo.status,
				incomingStatus: Status,
				incomingStatusName: statusName,
			},
			`Video already in final state '${existingVideo.status}', skipping update`,
		);
		return { success: true, message: "Video already in final state" };
	}

	// Handle status updates
	logger.info(
		{
			event: "bunny_webhook_processing_status",
			videoId: existingVideo.id,
			videoGuid: VideoGuid,
			status: Status,
			statusName,
		},
		`Processing status update: ${statusName}`,
	);

	switch (Status) {
		case BunnyStatus.QUEUED:
		case BunnyStatus.PROCESSING_PREVIEW:
		case BunnyStatus.ENCODING: {
			logger.debug(
				{
					event: "bunny_webhook_update_processing_start",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
					newStatus: "processing",
				},
				"Updating video status to processing",
			);

			const updateStart = Date.now();
			await db
				.update(video)
				.set({ status: "processing" })
				.where(eq(video.bunnyVideoId, VideoGuid));
			const updateDuration = Date.now() - updateStart;

			logger.info(
				{
					event: "bunny_webhook_processing_updated",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
					previousStatus: existingVideo.status,
					newStatus: "processing",
					bunnyStatus: statusName,
					updateDurationMs: updateDuration,
				},
				`Video status updated to processing (was ${existingVideo.status})`,
			);
			return { success: true, message: "Video status updated to processing" };
		}

		case BunnyStatus.RESOLUTION_FINISHED:
		case BunnyStatus.FINISHED: {
			logger.info(
				{
					event: "bunny_webhook_finished_processing",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
					statusName,
				},
				`Video encoding finished (${statusName}), fetching metadata`,
			);

			// Fetch metadata from Bunny API
			const metadata = await fetchBunnyVideoMetadata({
				videoGuid: VideoGuid,
				libraryId,
				apiKey,
				logger,
			});

			// If metadata fetch fails, mark video as failed
			if (!metadata) {
				logger.error(
					{
						event: "bunny_webhook_metadata_fetch_failed",
						videoId: existingVideo.id,
						videoGuid: VideoGuid,
						statusName,
					},
					"Metadata fetch failed, will mark video as failed",
				);

				const failUpdateStart = Date.now();
				await db
					.update(video)
					.set({
						status: "failed",
						errorMessage: "Failed to fetch video metadata after encoding",
					})
					.where(eq(video.bunnyVideoId, VideoGuid));
				const failUpdateDuration = Date.now() - failUpdateStart;

				logger.error(
					{
						event: "bunny_webhook_marked_failed_no_metadata",
						videoId: existingVideo.id,
						videoGuid: VideoGuid,
						updateDurationMs: failUpdateDuration,
					},
					"Video marked as failed due to metadata fetch failure",
				);
				return { success: false, message: "Failed to fetch video metadata" };
			}

			const updateData = {
				status: "ready" as const,
				duration: Math.round(metadata.length),
				width: metadata.width,
				height: metadata.height,
				fps: Math.round(metadata.framerate),
				thumbnailUrl: cdnHostname
					? `https://${cdnHostname}/${VideoGuid}/${metadata.thumbnailFileName || "thumbnail.jpg"}`
					: undefined,
				streamingUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${VideoGuid}`,
			};

			logger.debug(
				{
					event: "bunny_webhook_update_ready_start",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
					updateData: {
						status: updateData.status,
						duration: updateData.duration,
						width: updateData.width,
						height: updateData.height,
						fps: updateData.fps,
						thumbnailUrl: updateData.thumbnailUrl,
						streamingUrl: updateData.streamingUrl,
					},
				},
				"Updating video with metadata",
			);

			const updateStart = Date.now();
			await db
				.update(video)
				.set(updateData)
				.where(eq(video.bunnyVideoId, VideoGuid));
			const updateDuration = Date.now() - updateStart;

			logger.info(
				{
					event: "bunny_webhook_ready",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
					previousStatus: existingVideo.status,
					duration: updateData.duration,
					resolution: `${metadata.width}x${metadata.height}`,
					fps: updateData.fps,
					thumbnailUrl: updateData.thumbnailUrl,
					streamingUrl: updateData.streamingUrl,
					updateDurationMs: updateDuration,
				},
				`Video is ready: ${metadata.width}x${metadata.height}, ${updateData.duration}s`,
			);
			return { success: true, message: "Video is ready" };
		}

		case BunnyStatus.FAILED:
		case BunnyStatus.PRESIGNED_UPLOAD_FAILED: {
			logger.warn(
				{
					event: "bunny_webhook_failure_received",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
					status: Status,
					statusName,
				},
				`Received failure status: ${statusName}`,
			);

			// Try to fetch metadata to get actual error message
			const metadata = await fetchBunnyVideoMetadata({
				videoGuid: VideoGuid,
				libraryId,
				apiKey,
				logger,
			});

			// Extract error message from transcoding messages if available
			const errorMessage =
				metadata?.transcodingMessages?.[0]?.message ||
				(Status === BunnyStatus.PRESIGNED_UPLOAD_FAILED
					? "Video upload failed"
					: "Video encoding failed");

			const transcodingMessages = metadata?.transcodingMessages ?? [];

			logger.info(
				{
					event: "bunny_webhook_failure_details",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
					errorMessage,
					transcodingMessages: transcodingMessages.map((m) => ({
						timeStamp: m.timeStamp,
						level: m.level,
						issueCode: m.issueCode,
						message: m.message,
					})),
					hasMetadata: !!metadata,
				},
				`Failure details: ${errorMessage}`,
			);

			const updateStart = Date.now();
			await db
				.update(video)
				.set({
					status: "failed",
					errorMessage,
				})
				.where(eq(video.bunnyVideoId, VideoGuid));
			const updateDuration = Date.now() - updateStart;

			logger.error(
				{
					event: "bunny_webhook_failed",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
					previousStatus: existingVideo.status,
					errorMessage,
					bunnyStatus: statusName,
					updateDurationMs: updateDuration,
				},
				`Video marked as failed: ${errorMessage}`,
			);
			return { success: true, message: "Video marked as failed" };
		}

		default: {
			logger.info(
				{
					event: "bunny_webhook_status_ignored",
					videoId: existingVideo.id,
					videoGuid: VideoGuid,
					status: Status,
					statusName,
					currentDbStatus: existingVideo.status,
				},
				`Ignoring webhook status: ${statusName} (not a state we handle)`,
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
