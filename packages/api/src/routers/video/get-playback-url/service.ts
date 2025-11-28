import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type { GetPlaybackUrlOutput } from "./type";

export async function getPlaybackUrl({
	userId,
	id,
	logger,
}: {
	userId: string;
	id: string;
	logger: Logger;
}): Promise<GetPlaybackUrlOutput> {
	logger.debug(
		{ event: "get_playback_url_start", videoId: id, userId },
		"Fetching playback URL",
	);

	try {
		// 1. Fetch video with project info
		const videos = await db
			.select({
				id: video.id,
				projectId: video.projectId,
				status: video.status,
				bunnyVideoId: video.bunnyVideoId,
				bunnyLibraryId: video.bunnyLibraryId,
				thumbnailUrl: video.thumbnailUrl,
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
				{ event: "get_playback_url_not_found", videoId: id },
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

		// 2. Check permissions
		const isProjectOwner = videoData.project.ownerId === userId;
		let isMember = false;

		if (!isProjectOwner) {
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

			isMember = membership.length > 0;
		}

		if (!isProjectOwner && !isMember) {
			logger.warn(
				{ event: "get_playback_url_forbidden", videoId: id, userId },
				"User is not a member of this project",
			);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You do not have access to this video",
			});
		}

		// 3. Check if video is ready
		if (videoData.status !== "ready") {
			logger.warn(
				{
					event: "get_playback_url_not_ready",
					videoId: id,
					status: videoData.status,
				},
				"Video is not ready for playback",
			);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Video is not ready for playback (status: ${videoData.status})`,
			});
		}

		// 4. Construct the embed URL from Bunny IDs
		const embedUrl = `https://iframe.mediadelivery.net/embed/${videoData.bunnyLibraryId}/${videoData.bunnyVideoId}`;

		logger.debug(
			{ event: "get_playback_url_success", videoId: id, userId },
			"Playback URL fetched successfully",
		);

		return {
			playbackUrl: embedUrl,
			thumbnailUrl: videoData.thumbnailUrl,
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_playback_url_error",
				videoId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to fetch playback URL",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to fetch playback URL.",
		});
	}
}
