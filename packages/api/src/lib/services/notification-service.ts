import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { notification } from "@koko/db/schema/notification";
import { projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { eq, inArray } from "drizzle-orm";
import type { Logger } from "../logger/types";

/**
 * Process comment mentions: validate user IDs, check project membership, create notifications
 * Returns array of valid user IDs that should be stored in the mentions field
 */
export async function processCommentMentions({
	commentId,
	videoId,
	mentionedUserIds,
	authorId,
	logger,
}: {
	commentId: string;
	videoId: string;
	mentionedUserIds: string[];
	authorId: string;
	logger: Logger;
}): Promise<string[]> {
	// If no mentions, return empty array
	if (mentionedUserIds.length === 0) {
		return [];
	}

	try {
		// Get video with project info
		const [videoRecord] = await db
			.select({
				id: video.id,
				projectId: video.projectId,
				title: video.title,
			})
			.from(video)
			.where(eq(video.id, videoId))
			.limit(1);

		if (!videoRecord) {
			logger.warn(
				{ event: "process_mentions_video_not_found", videoId },
				"Video not found for mention processing",
			);
			return [];
		}

		// Get project members for this project
		const members = await db
			.select({
				userId: projectMember.userId,
			})
			.from(projectMember)
			.where(eq(projectMember.projectId, videoRecord.projectId));

		const memberIds = new Set(members.map((m) => m.userId));

		// Filter mentions to only include valid project members (excluding author)
		const validMentionIds = mentionedUserIds.filter(
			(userId) => userId !== authorId && memberIds.has(userId),
		);

		// Remove duplicates
		const uniqueValidMentionIds = Array.from(new Set(validMentionIds));

		if (uniqueValidMentionIds.length === 0) {
			logger.debug(
				{
					event: "process_mentions_no_valid",
					commentId,
					mentionedUserIds,
				},
				"No valid mentions after filtering",
			);
			return [];
		}

		// Get mentioned users' info for notifications
		const mentionedUsers = await db
			.select({
				id: user.id,
				name: user.name,
			})
			.from(user)
			.where(inArray(user.id, uniqueValidMentionIds));

		// Get author name for notification
		const [author] = await db
			.select({ name: user.name })
			.from(user)
			.where(eq(user.id, authorId))
			.limit(1);

		const authorName = author?.name || "Someone";

		// Create notifications for each mentioned user
		// Use Promise.allSettled to not block on notification failures
		const notificationPromises = mentionedUsers.map((mentionedUser) =>
			db
				.insert(notification)
				.values({
					id: crypto.randomUUID(),
					userId: mentionedUser.id,
					type: "comment_mention",
					title: "You were mentioned in a comment",
					message: `${authorName} mentioned you in "${videoRecord.title}"`,
					resourceType: "comment",
					resourceId: commentId,
					actorId: authorId,
				})
				.catch((error) => {
					logger.error(
						{
							event: "create_mention_notification_error",
							userId: mentionedUser.id,
							commentId,
							error:
								error instanceof Error
									? { message: error.message, stack: error.stack }
									: error,
						},
						"Failed to create mention notification",
					);
				}),
		);

		await Promise.allSettled(notificationPromises);

		logger.info(
			{
				event: "process_mentions_success",
				commentId,
				mentionCount: uniqueValidMentionIds.length,
			},
			"Processed comment mentions",
		);

		return uniqueValidMentionIds;
	} catch (error) {
		logger.error(
			{
				event: "process_mentions_error",
				commentId,
				videoId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to process mentions",
		);
		// Don't throw - return empty array to not block comment creation
		return [];
	}
}
