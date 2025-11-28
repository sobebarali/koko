import { db } from "@koko/db";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type { UpdateMetadataInput, UpdateMetadataOutput } from "./type";

export async function updateMetadata({
	userId,
	id,
	title,
	description,
	tags,
	logger,
}: {
	userId: string;
	logger: Logger;
} & UpdateMetadataInput): Promise<UpdateMetadataOutput> {
	logger.debug(
		{ event: "update_video_metadata_start", videoId: id, userId },
		"Updating video metadata",
	);

	try {
		// 1. Fetch video with project info
		const videos = await db
			.select({
				id: video.id,
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
				{ event: "update_video_metadata_not_found", videoId: id },
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

		// 2. Check permissions (uploader OR project owner can update)
		const isUploader = videoData.uploadedBy === userId;
		const isProjectOwner = videoData.project.ownerId === userId;

		if (!isUploader && !isProjectOwner) {
			// Check if user is a project member with elevated role
			const membership = await db
				.select({ role: projectMember.role })
				.from(projectMember)
				.where(
					and(
						eq(projectMember.projectId, videoData.projectId),
						eq(projectMember.userId, userId),
					),
				)
				.limit(1);

			// Only editors and owners can update metadata
			const memberData = membership[0];
			const canEdit =
				memberData &&
				(memberData.role === "editor" || memberData.role === "owner");

			if (!canEdit) {
				logger.warn(
					{ event: "update_video_metadata_forbidden", videoId: id, userId },
					"User does not have permission to update this video",
				);
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have permission to update this video",
				});
			}
		}

		// 3. Build update data
		const updateData: Record<string, unknown> = {};
		if (title !== undefined) updateData.title = title;
		if (description !== undefined) updateData.description = description;
		if (tags !== undefined) updateData.tags = tags;

		// 4. Update video
		const [updated] = await db
			.update(video)
			.set(updateData)
			.where(eq(video.id, id))
			.returning({
				id: video.id,
				title: video.title,
				description: video.description,
				tags: video.tags,
				updatedAt: video.updatedAt,
			});

		if (!updated) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to update video.",
			});
		}

		logger.info(
			{ event: "update_video_metadata_success", videoId: id, userId },
			"Video metadata updated successfully",
		);

		return {
			video: {
				...updated,
				tags: updated.tags ?? [],
			},
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "update_video_metadata_error",
				videoId: id,
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to update video metadata",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update video.",
		});
	}
}
