import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { comment } from "@koko/db/schema/comment";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, isNull, like, lte, sql } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type { SearchCommentsInput, SearchCommentsOutput } from "./type";

export async function searchComments({
	userId,
	videoId,
	searchText,
	authorId,
	timecodeRange,
	mentionedUserId,
	limit,
	cursor,
	logger,
}: {
	userId: string;
	logger: Logger;
} & SearchCommentsInput): Promise<SearchCommentsOutput> {
	logger.debug(
		{
			event: "search_comments_start",
			userId,
			videoId,
			searchText,
			authorId,
			timecodeRange,
			mentionedUserId,
		},
		"Searching comments",
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

		// Build WHERE conditions
		const conditions = [
			eq(comment.videoId, videoId),
			isNull(comment.deletedAt),
		];

		// Add text search filter
		if (searchText) {
			conditions.push(like(comment.text, `%${searchText}%`));
		}

		// Add author filter
		if (authorId) {
			conditions.push(eq(comment.authorId, authorId));
		}

		// Add timecode range filter
		if (timecodeRange) {
			conditions.push(gte(comment.timecode, timecodeRange.start));
			conditions.push(lte(comment.timecode, timecodeRange.end));
		}

		// Add mentions filter using SQLite json_each()
		if (mentionedUserId) {
			conditions.push(
				sql`EXISTS (
					SELECT 1 FROM json_each(${comment.mentions})
					WHERE json_each.value = ${mentionedUserId}
				)`,
			);
		}

		// Add cursor filter (use createdAt for stable pagination)
		if (cursor) {
			const cursorDate = new Date(Number.parseInt(cursor, 10));
			conditions.push(sql`${comment.createdAt} > ${cursorDate.getTime()}`);
		}

		// Query comments with limit + 1 for pagination
		const comments = await db
			.select({
				id: comment.id,
				videoId: comment.videoId,
				authorId: comment.authorId,
				text: comment.text,
				timecode: comment.timecode,
				parentId: comment.parentId,
				replyCount: comment.replyCount,
				resolved: comment.resolved,
				resolvedAt: comment.resolvedAt,
				resolvedBy: comment.resolvedBy,
				edited: comment.edited,
				editedAt: comment.editedAt,
				mentions: comment.mentions,
				createdAt: comment.createdAt,
				updatedAt: comment.updatedAt,
				author: {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image,
				},
			})
			.from(comment)
			.leftJoin(user, eq(comment.authorId, user.id))
			.where(and(...conditions))
			.orderBy(asc(comment.timecode), asc(comment.createdAt), asc(comment.id))
			.limit(limit + 1);

		// Determine if there are more results
		const hasMore = comments.length > limit;
		const results = hasMore ? comments.slice(0, limit) : comments;
		const lastResult = results[results.length - 1];
		const nextCursor =
			hasMore && lastResult ? lastResult.createdAt.getTime().toString() : null;

		logger.info(
			{
				event: "search_comments_success",
				userId,
				videoId,
				resultCount: results.length,
			},
			"Comments search completed",
		);

		return {
			comments: results.map((c) => ({
				...c,
				author: c.author || {
					id: "",
					name: "Unknown",
					email: "",
					image: null,
				},
				mentions: c.mentions ?? [],
			})),
			nextCursor,
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "search_comments_error",
				userId,
				videoId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to search comments",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to search comments",
		});
	}
}
