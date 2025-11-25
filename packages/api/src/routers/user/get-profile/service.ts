import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger";
import { privateProfileSelect } from "../constants";
import type { GetProfileOutput } from "./type";

export async function getProfile({
	userId,
	logger,
}: {
	userId: string;
	logger: Logger;
}): Promise<GetProfileOutput> {
	logger.debug({ event: "get_profile_start", userId }, "Fetching user profile");

	try {
		const [profile] = await db
			.select(privateProfileSelect)
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		if (!profile) {
			logger.warn({ event: "get_profile_not_found", userId }, "User not found");
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		logger.debug(
			{ event: "get_profile_success", userId },
			"Profile fetched successfully",
		);
		return { user: profile };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_profile_error",
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to fetch profile",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to fetch profile.",
		});
	}
}
