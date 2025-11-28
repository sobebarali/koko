import { db } from "@koko/db";
import { comment } from "@koko/db/schema/comment";
import { project } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { processCommentMentions } from "../../../lib/services/notification-service";
import { commentSelect } from "../constants";
import type { ReplyToCommentInput, ReplyToCommentOutput } from "./type";

export async function replyToComment({
	userId,
	parentId,
	text,
	mentions,
	logger,
}: {
	userId: string;
	logger: Logger;
} & ReplyToCommentInput): Promise<ReplyToCommentOutput> {
	logger.debug(
		{ event: "reply_to_comment_start", userId, parentId },
		"Creating reply to comment",
	);

	try {
		// Fetch parent comment
		const [parentComment] = await db
			.select({
				id: comment.id,
				videoId: comment.videoId,
				timecode: comment.timecode,
				parentId: comment.parentId,
				deletedAt: comment.deletedAt,
			})
			.from(comment)
			.where(eq(comment.id, parentId))
			.limit(1);

		if (!parentComment) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Parent comment not found",
			});
		}

		// Check if parent is soft-deleted
		if (parentComment.deletedAt !== null) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Parent comment not found",
			});
		}

		// Prevent nested replies (replies to replies)
		if (parentComment.parentId !== null) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Cannot reply to a reply",
			});
		}

		// Fetch video to get projectId
		const [existingVideo] = await db
			.select({ id: video.id, projectId: video.projectId })
			.from(video)
			.where(eq(video.id, parentComment.videoId))
			.limit(1);

		if (!existingVideo) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Video not found",
			});
		}

		const replyId = crypto.randomUUID();

		// Process mentions before transaction
		const validMentionIds = await processCommentMentions({
			commentId: replyId,
			videoId: parentComment.videoId,
			mentionedUserIds: mentions ?? [],
			authorId: userId,
			logger,
		});

		// Use transaction to insert reply, increment parent replyCount, and video/project commentCount
		const [newReply] = await db.transaction(async (tx) => {
			const [insertedReply] = await tx
				.insert(comment)
				.values({
					id: replyId,
					videoId: parentComment.videoId,
					authorId: userId,
					text,
					timecode: parentComment.timecode,
					parentId,
					mentions: validMentionIds,
				})
				.returning(commentSelect);

			// Increment parent's replyCount
			await tx
				.update(comment)
				.set({
					replyCount: sql`${comment.replyCount} + 1`,
				})
				.where(eq(comment.id, parentId));

			// Increment video's commentCount
			await tx
				.update(video)
				.set({
					commentCount: sql`${video.commentCount} + 1`,
				})
				.where(eq(video.id, parentComment.videoId));

			// Increment project's commentCount
			await tx
				.update(project)
				.set({
					commentCount: sql`${project.commentCount} + 1`,
				})
				.where(eq(project.id, existingVideo.projectId));

			return [insertedReply];
		});

		if (!newReply) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create reply",
			});
		}

		logger.info(
			{
				event: "reply_to_comment_success",
				userId,
				replyId,
				parentId,
			},
			"Reply created successfully",
		);

		return {
			comment: {
				...newReply,
				mentions: newReply.mentions ?? [],
			},
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "reply_to_comment_error",
				userId,
				parentId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to create reply",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create reply",
		});
	}
}
