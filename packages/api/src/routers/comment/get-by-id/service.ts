import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { comment } from "@koko/db/schema/comment";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { authorSelect, commentSelect } from "../constants";
import type {
	CommentReply,
	GetCommentByIdInput,
	GetCommentByIdOutput,
} from "./type";

export async function getCommentById({
	userId,
	id,
	logger,
}: {
	userId: string;
	logger: Logger;
} & GetCommentByIdInput): Promise<GetCommentByIdOutput> {
	logger.debug(
		{ event: "get_comment_by_id_start", userId, commentId: id },
		"Fetching comment by ID",
	);

	try {
		// Fetch comment with author info
		const [foundComment] = await db
			.select({
				...commentSelect,
				author: authorSelect,
			})
			.from(comment)
			.innerJoin(user, eq(comment.authorId, user.id))
			.where(eq(comment.id, id))
			.limit(1);

		if (!foundComment) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Comment not found",
			});
		}

		// Fetch replies if this is a top-level comment
		let replies: CommentReply[] = [];
		if (foundComment.parentId === null) {
			const fetchedReplies = await db
				.select({
					...commentSelect,
					author: authorSelect,
				})
				.from(comment)
				.innerJoin(user, eq(comment.authorId, user.id))
				.where(and(eq(comment.parentId, id)))
				.orderBy(asc(comment.createdAt));

			replies = fetchedReplies.map((reply) => ({
				...reply,
				mentions: reply.mentions ?? [],
			}));
		}

		logger.info(
			{ event: "get_comment_by_id_success", userId, commentId: id },
			"Comment fetched successfully",
		);

		return {
			comment: {
				id: foundComment.id,
				videoId: foundComment.videoId,
				authorId: foundComment.authorId,
				text: foundComment.text,
				timecode: foundComment.timecode,
				parentId: foundComment.parentId,
				replyCount: foundComment.replyCount,
				resolved: foundComment.resolved,
				resolvedAt: foundComment.resolvedAt,
				resolvedBy: foundComment.resolvedBy,
				edited: foundComment.edited,
				editedAt: foundComment.editedAt,
				mentions: foundComment.mentions ?? [],
				createdAt: foundComment.createdAt,
				updatedAt: foundComment.updatedAt,
				author: foundComment.author,
				replies,
			},
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_comment_by_id_error",
				userId,
				commentId: id,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to fetch comment",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to fetch comment",
		});
	}
}
