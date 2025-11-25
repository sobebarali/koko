import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger";
import { privateProfileSelect } from "../constants";
import type { UpdateProfileInput, UpdateProfileOutput } from "./type";

export async function updateProfile({
	userId,
	logger,
	name,
	bio,
	title,
	company,
	location,
	website,
}: {
	userId: string;
	logger: Logger;
} & UpdateProfileInput): Promise<UpdateProfileOutput> {
	const fieldsToUpdate = Object.entries({
		name,
		bio,
		title,
		company,
		location,
		website,
	})
		.filter(([, value]) => value !== undefined)
		.map(([key]) => key);

	logger.debug(
		{ event: "update_profile_start", userId, fields: fieldsToUpdate },
		"Updating user profile",
	);

	try {
		const updateData: Record<string, string | undefined> = {};

		if (name !== undefined) {
			updateData.name = name;
		}
		if (bio !== undefined) {
			updateData.bio = bio;
		}
		if (title !== undefined) {
			updateData.title = title;
		}
		if (company !== undefined) {
			updateData.company = company;
		}
		if (location !== undefined) {
			updateData.location = location;
		}
		if (website !== undefined) {
			updateData.website = website;
		}

		const [updated] = await db
			.update(user)
			.set(updateData)
			.where(eq(user.id, userId))
			.returning(privateProfileSelect);

		if (!updated) {
			logger.warn(
				{ event: "update_profile_not_found", userId },
				"User not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		logger.info(
			{ event: "update_profile_success", userId, fields: fieldsToUpdate },
			"Profile updated successfully",
		);
		return { user: updated };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "update_profile_error",
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to update profile",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update profile.",
		});
	}
}
