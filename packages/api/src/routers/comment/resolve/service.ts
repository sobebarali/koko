import { db } from "@koko/db";
import { comment } from "@koko/db/schema/comment";
import { project } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import { commentSelect } from "../constants";
import type { ResolveCommentInput, ResolveCommentOutput } from "./type";

export async function resolveComment({
	userId,
	id,
	resolved,
	logger,
}: {
	userId: string;
	logger: Logger;
} & ResolveCommentInput): Promise<ResolveCommentOutput> {
	logger.debug(
		{ event: "resolve_comment_start", userId, commentId: id, resolved },
		"Resolving/unresolving comment",
	);

	try {
		// Step 1: Fetch comment
		const [existingComment] = await db
			.select({
				id: comment.id,
				videoId: comment.videoId,
				authorId: comment.authorId,
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

		// Check if user is the comment author
		const isAuthor = existingComment.authorId === userId;

		// Step 2: If not author, check if user is project owner
		let isProjectOwner = false;
		if (!isAuthor) {
			// Fetch video to get projectId
			const [videoRecord] = await db
				.select({ projectId: video.projectId })
				.from(video)
				.where(eq(video.id, existingComment.videoId))
				.limit(1);

			if (videoRecord) {
				// Fetch project to check ownership
				const [projectRecord] = await db
					.select({ ownerId: project.ownerId })
					.from(project)
					.where(eq(project.id, videoRecord.projectId))
					.limit(1);

				isProjectOwner = projectRecord?.ownerId === userId;
			}
		}

		// Check permission: user must be comment author OR project owner
		if (!isAuthor && !isProjectOwner) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message:
					"Only the comment author or project owner can resolve comments",
			});
		}

		// Update the comment
		const [updatedComment] = await db
			.update(comment)
			.set({
				resolved,
				resolvedAt: resolved ? new Date() : null,
				resolvedBy: resolved ? userId : null,
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
			{
				event: "resolve_comment_success",
				userId,
				commentId: id,
				resolved,
			},
			`Comment ${resolved ? "resolved" : "unresolved"} successfully`,
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
				event: "resolve_comment_error",
				userId,
				commentId: id,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to resolve comment",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to resolve comment",
		});
	}
}
