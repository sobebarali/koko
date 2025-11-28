import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { project, projectMember } from "@koko/db/schema/project";
import { video } from "@koko/db/schema/video";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import type { Logger } from "../../../lib/logger/types";
import type {
	GetMentionableUsersInput,
	GetMentionableUsersOutput,
} from "./type";

export async function getMentionableUsers({
	userId,
	videoId,
	logger,
}: {
	userId: string;
	logger: Logger;
} & GetMentionableUsersInput): Promise<GetMentionableUsersOutput> {
	logger.debug(
		{ event: "get_mentionable_users_start", userId, videoId },
		"Fetching mentionable users for video",
	);

	try {
		// Get video and project info
		const [videoRecord] = await db
			.select({
				id: video.id,
				projectId: video.projectId,
			})
			.from(video)
			.where(and(eq(video.id, videoId)))
			.limit(1);

		if (!videoRecord) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Video not found",
			});
		}

		// Check if user has access to this video's project
		const [projectRecord] = await db
			.select({ ownerId: project.ownerId })
			.from(project)
			.where(eq(project.id, videoRecord.projectId))
			.limit(1);

		const isOwner = projectRecord?.ownerId === userId;
		let isMember = false;

		if (!isOwner) {
			const membership = await db
				.select({ id: projectMember.id })
				.from(projectMember)
				.where(
					and(
						eq(projectMember.projectId, videoRecord.projectId),
						eq(projectMember.userId, userId),
					),
				)
				.limit(1);

			isMember = membership.length > 0;
		}

		if (!isOwner && !isMember) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You do not have access to this video",
			});
		}

		// Get all project members
		const members = await db
			.select({
				userId: projectMember.userId,
			})
			.from(projectMember)
			.where(eq(projectMember.projectId, videoRecord.projectId));

		// Get project owner ID and add to member list
		const memberIds = members.map((m) => m.userId);
		if (projectRecord?.ownerId && !memberIds.includes(projectRecord.ownerId)) {
			memberIds.push(projectRecord.ownerId);
		}

		// Exclude current user from the list (can't mention yourself)
		const mentionableUserIds = memberIds.filter((id) => id !== userId);

		if (mentionableUserIds.length === 0) {
			logger.debug(
				{ event: "get_mentionable_users_empty", userId, videoId },
				"No mentionable users found",
			);
			return { users: [] };
		}

		// Get user details
		const users = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
			})
			.from(user)
			.where(inArray(user.id, mentionableUserIds));

		logger.info(
			{
				event: "get_mentionable_users_success",
				userId,
				videoId,
				userCount: users.length,
			},
			"Mentionable users fetched successfully",
		);

		return { users };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_mentionable_users_error",
				userId,
				videoId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to get mentionable users",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to get mentionable users",
		});
	}
}
