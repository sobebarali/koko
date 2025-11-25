import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { privateProfileSelect } from "../constants";
import type { GetProfileOutput } from "./type";

export async function getProfile({
	userId,
}: {
	userId: string;
}): Promise<GetProfileOutput> {
	try {
		const [profile] = await db
			.select(privateProfileSelect)
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		if (!profile) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		return { user: profile };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to fetch profile.",
		});
	}
}
