import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { privateProfileSelect } from "../constants";
import type {
	UpdateProfileInput,
	UpdateProfileOutput,
} from "../types/update-profile";

export async function updateProfile({
	userId,
	name,
	bio,
	title,
	company,
	location,
	website,
}: {
	userId: string;
} & UpdateProfileInput): Promise<UpdateProfileOutput> {
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
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		return { user: updated };
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update profile.",
		});
	}
}
