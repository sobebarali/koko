import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger";
import { publicProfileSelect } from "../constants";
import type { GetByIdOutput } from "./type";

export async function getById({
	id,
	logger,
}: {
	id: string;
	logger: Logger;
}): Promise<GetByIdOutput> {
	logger.debug(
		{ event: "get_by_id_start", targetUserId: id },
		"Fetching user by ID",
	);

	try {
		const [profile] = await db
			.select(publicProfileSelect)
			.from(user)
			.where(eq(user.id, id))
			.limit(1);

		if (!profile) {
			logger.warn(
				{ event: "get_by_id_not_found", targetUserId: id },
				"User not found",
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		logger.debug(
			{ event: "get_by_id_success", targetUserId: id },
			"User fetched successfully",
		);
		return { user: profile };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "get_by_id_error",
				targetUserId: id,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to fetch user",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to fetch user.",
		});
	}
}
