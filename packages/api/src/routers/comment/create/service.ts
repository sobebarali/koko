import { db } from "@koko/db";
import { comment } from "@koko/db/schema/comment";
import { project } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { commentSelect } from "../constants";
import type { CreateCommentInput, CreateCommentOutput } from "./type";

export async function createComment({
	userId,
	videoId,
	text,
	timecode,
	mentions,
	logger,
}: {
	userId: string;
	logger: Logger;
} & CreateCommentInput): Promise<CreateCommentOutput> {
	logger.debug(
		{ event: "create_comment_start", userId, videoId, timecode },
		"Creating new comment",
	);

	try {
		// Verify video exists and get projectId
		const [existingVideo] = await db
			.select({ id: video.id, projectId: video.projectId })
			.from(video)
			.where(eq(video.id, videoId))
			.limit(1);

		if (!existingVideo) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Video not found",
			});
		}

		const commentId = crypto.randomUUID();

		// Use transaction to insert comment and update video/project commentCount
		const [newComment] = await db.transaction(async (tx) => {
			const [insertedComment] = await tx
				.insert(comment)
				.values({
					id: commentId,
					videoId,
					authorId: userId,
					text,
					timecode,
					mentions: mentions ?? [],
				})
				.returning(commentSelect);

			// Increment video's commentCount
			await tx
				.update(video)
				.set({
					commentCount: sql`${video.commentCount} + 1`,
				})
				.where(eq(video.id, videoId));

			// Increment project's commentCount
			await tx
				.update(project)
				.set({
					commentCount: sql`${project.commentCount} + 1`,
				})
				.where(eq(project.id, existingVideo.projectId));

			return [insertedComment];
		});

		if (!newComment) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create comment",
			});
		}

		logger.info(
			{ event: "create_comment_success", userId, commentId, videoId },
			"Comment created successfully",
		);

		return {
			comment: {
				...newComment,
				mentions: newComment.mentions ?? [],
			},
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "create_comment_error",
				userId,
				videoId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to create comment",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create comment",
		});
	}
}
