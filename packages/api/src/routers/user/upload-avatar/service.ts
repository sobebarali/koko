import { db } from "@koko/db";
import { user } from "@koko/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Logger } from "../../../lib/logger";
import {
	AVATAR_MIME_MAP,
	type AvatarMimeType,
	type AvatarUploadOutput,
} from "./type";

function sanitizeFileName({ fileName }: { fileName: string }): string {
	return (
		fileName
			.replace(/\.[^/.]+$/, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "avatar"
	);
}

export async function uploadAvatar({
	userId,
	fileName,
	mimeType,
	logger,
}: {
	userId: string;
	fileName: string;
	mimeType: AvatarMimeType;
	logger: Logger;
}): Promise<AvatarUploadOutput> {
	logger.debug(
		{ event: "upload_avatar_start", userId, mimeType },
		"Generating avatar upload URL",
	);

	try {
		const storageZone = process.env.BUNNY_STORAGE_ZONE;
		const storageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
		const storageEndpoint =
			process.env.BUNNY_STORAGE_ENDPOINT ?? "https://storage.bunnycdn.com";
		const cdnBaseUrl = process.env.BUNNY_STORAGE_CDN_URL;

		if (!storageZone || !storageAccessKey || !cdnBaseUrl) {
			logger.error(
				{ event: "upload_avatar_config_missing", userId },
				"Avatar storage is not configured",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Avatar storage is not configured.",
			});
		}

		const extension = AVATAR_MIME_MAP[mimeType];
		if (!extension) {
			logger.warn(
				{ event: "upload_avatar_invalid_type", userId, mimeType },
				"Unsupported file type",
			);
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Unsupported file type.",
			});
		}

		const normalizedEndpoint = storageEndpoint.replace(/\/+$/, "");
		const normalizedCdnBase = cdnBaseUrl.replace(/\/+$/, "");
		const sanitizedName = sanitizeFileName({ fileName });
		const objectKey = `avatars/${userId}/${Date.now()}-${sanitizedName}.${extension}`;

		const uploadUrl = `${normalizedEndpoint}/${storageZone}/${objectKey}`;
		const avatarUrl = `${normalizedCdnBase}/${objectKey}`;

		// Save avatar URL to user's image field in database
		await db.update(user).set({ image: avatarUrl }).where(eq(user.id, userId));

		logger.info(
			{ event: "upload_avatar_success", userId, objectKey },
			"Avatar upload URL generated successfully",
		);

		return {
			uploadUrl,
			uploadHeaders: {
				AccessKey: storageAccessKey,
				"Content-Type": mimeType,
			},
			avatarUrl,
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		logger.error(
			{
				event: "upload_avatar_error",
				userId,
				error:
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
			},
			"Failed to generate upload URL",
		);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to generate upload URL.",
		});
	}
}
