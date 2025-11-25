import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { publicProfileSelect } from "../constants";
import type { GetByIdOutput } from "../types/get-by-id";

export async function getById({ id }: { id: string }): Promise<GetByIdOutput> {
	try {
		const [profile] = await db
			.select(publicProfileSelect)
			.from(user)
			.where(eq(user.id, id))
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
			message: "Failed to fetch user.",
		});
	}
}
