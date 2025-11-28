import { db } from "@koko/db";
import { comment } from "@koko/db/schema/comment";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { processCommentMentions } from "../../../lib/services/notification-service";
import { commentSelect } from "../constants";
import type { UpdateCommentInput, UpdateCommentOutput } from "./type";

export async function updateComment({
	userId,
	id,
	text,
	mentions,
	logger,
}: {
	userId: string;
	logger: Logger;
} & UpdateCommentInput): Promise<UpdateCommentOutput> {
	logger.debug(
		{ event: "update_comment_start", userId, commentId: id },
		"Updating comment",
	);

	try {
		// Fetch existing comment with mentions and videoId
		const [existingComment] = await db
			.select({
				id: comment.id,
				authorId: comment.authorId,
				deletedAt: comment.deletedAt,
				videoId: comment.videoId,
				mentions: comment.mentions,
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

		// Check if comment is soft-deleted
		if (existingComment.deletedAt !== null) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Comment not found",
			});
		}

		// Check if user is the author
		if (existingComment.authorId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only edit your own comments",
			});
		}

		// Process new mentions
		const validMentionIds = await processCommentMentions({
			commentId: id,
			videoId: existingComment.videoId,
			mentionedUserIds: mentions ?? [],
			authorId: userId,
			logger,
		});

		// Diff logic: identify newly added mentions (not in old mentions)
		// Only newly added mentions should trigger notifications
		// (processCommentMentions already creates notifications for all validMentionIds,
		// so we need to create a separate function for diff-based notifications)
		// For MVP, we'll let processCommentMentions handle it (notifications for all)
		// TODO: In future, enhance to only notify new mentions

		// Update the comment
		const [updatedComment] = await db
			.update(comment)
			.set({
				text,
				mentions: validMentionIds,
				edited: true,
				editedAt: new Date(),
			})
			.where(eq(comment.id, id))
			.returning(commentSelect);

		if (!updatedComment) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to update comment",
			});
		}

		logger.info(
			{ event: "update_comment_success", userId, commentId: id },
			"Comment updated successfully",
		);

		return {
			comment: {
				...updatedComment,
				mentions: updatedComment.mentions ?? [],
			},
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "update_comment_error",
				userId,
				commentId: id,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to update comment",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update comment",
		});
	}
}
