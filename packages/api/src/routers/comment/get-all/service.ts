import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { comment } from "@koko/db/schema/comment";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { authorSelect, commentSelect } from "../constants";
import type {
	CommentReply,
	CommentWithReplies,
	GetAllCommentsInput,
	GetAllCommentsOutput,
} from "./type";

export async function getAllComments({
	userId,
	videoId,
	resolved,
	logger,
}: {
	userId: string;
	logger: Logger;
} & GetAllCommentsInput): Promise<GetAllCommentsOutput> {
	logger.debug(
		{ event: "get_all_comments_start", userId, videoId, resolved },
		"Fetching comments for video",
	);

	try {
		// Verify video exists
		const [existingVideo] = await db
			.select({ id: video.id })
			.from(video)
			.where(eq(video.id, videoId))
			.limit(1);

		if (!existingVideo) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Video not found",
			});
		}

		// Build where conditions for top-level comments
		const conditions = [
			eq(comment.videoId, videoId),
			isNull(comment.parentId),
			isNull(comment.deletedAt),
		];

		// Add resolved filter if not "all"
		if (resolved === "resolved") {
			conditions.push(eq(comment.resolved, true));
		} else if (resolved === "unresolved") {
			conditions.push(eq(comment.resolved, false));
		}

		// Fetch top-level comments with author info
		const topLevelComments = await db
			.select({
				...commentSelect,
				author: authorSelect,
			})
			.from(comment)
			.innerJoin(user, eq(comment.authorId, user.id))
			.where(and(...conditions))
			.orderBy(asc(comment.timecode));

		// Fetch replies for each top-level comment
		const commentsWithReplies: CommentWithReplies[] = await Promise.all(
			topLevelComments.map(async (topComment) => {
				const replies = await db
					.select({
						...commentSelect,
						author: authorSelect,
					})
					.from(comment)
					.innerJoin(user, eq(comment.authorId, user.id))
					.where(
						and(eq(comment.parentId, topComment.id), isNull(comment.deletedAt)),
					)
					.orderBy(asc(comment.createdAt));

				return {
					...topComment,
					mentions: topComment.mentions ?? [],
					replies: replies.map(
						(reply): CommentReply => ({
							...reply,
							mentions: reply.mentions ?? [],
						}),
					),
				};
			}),
		);

		logger.info(
			{
				event: "get_all_comments_success",
				userId,
				videoId,
				count: commentsWithReplies.length,
			},
			"Comments fetched successfully",
		);

		return { comments: commentsWithReplies };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_all_comments_error",
				userId,
				videoId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to fetch comments",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to fetch comments",
		});
	}
}
