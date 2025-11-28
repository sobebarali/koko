import { db } from "@koko/db";
import { comment } from "@koko/db/schema/comment";
import { project } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type { DeleteCommentInput, DeleteCommentOutput } from "./type";

export async function deleteComment({
	userId,
	id,
	logger,
}: {
	userId: string;
	logger: Logger;
} & DeleteCommentInput): Promise<DeleteCommentOutput> {
	logger.debug(
		{ event: "delete_comment_start", userId, commentId: id },
		"Deleting comment",
	);

	try {
		// Fetch existing comment
		const [existingComment] = await db
			.select({
				id: comment.id,
				videoId: comment.videoId,
				authorId: comment.authorId,
				parentId: comment.parentId,
			})
			.from(comment)
			.where(eq(comment.id, id))
			.limit(1);

		if (!existingComment) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Comment not found",
			});
		}

		// Check if user is the author
		if (existingComment.authorId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only delete your own comments",
			});
		}

		// Fetch video to get projectId
		const [existingVideo] = await db
			.select({ id: video.id, projectId: video.projectId })
			.from(video)
			.where(eq(video.id, existingComment.videoId))
			.limit(1);

		if (!existingVideo) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Video not found",
			});
		}

		// Use transaction to hard delete and decrement video/project commentCount
		await db.transaction(async (tx) => {
			// Hard delete the comment
			await tx.delete(comment).where(eq(comment.id, id));

			// If this is a reply, decrement parent's replyCount
			if (existingComment.parentId) {
				await tx
					.update(comment)
					.set({
						replyCount: sql`MAX(0, ${comment.replyCount} - 1)`,
					})
					.where(eq(comment.id, existingComment.parentId));
			}

			// Decrement video's commentCount (ensure it doesn't go below 0)
			await tx
				.update(video)
				.set({
					commentCount: sql`MAX(0, ${video.commentCount} - 1)`,
				})
				.where(eq(video.id, existingComment.videoId));

			// Decrement project's commentCount (ensure it doesn't go below 0)
			await tx
				.update(project)
				.set({
					commentCount: sql`MAX(0, ${project.commentCount} - 1)`,
				})
				.where(eq(project.id, existingVideo.projectId));
		});

		logger.info(
			{ event: "delete_comment_success", userId, commentId: id },
			"Comment deleted successfully",
		);

		return { success: true };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "delete_comment_error",
				userId,
				commentId: id,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to delete comment",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to delete comment",
		});
	}
}
