import { TRPCError } from "@trpc/server";
import {
	AVATAR_MIME_MAP,
	type AvatarMimeType,
	type AvatarUploadOutput,
} from "../types/upload-avatar";

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
}: {
	userId: string;
	fileName: string;
	mimeType: AvatarMimeType;
}): Promise<AvatarUploadOutput> {
	try {
		const storageZone = process.env.BUNNY_STORAGE_ZONE;
		const storageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
		const storageEndpoint =
			process.env.BUNNY_STORAGE_ENDPOINT ?? "https://storage.bunnycdn.com";
		const cdnBaseUrl = process.env.BUNNY_STORAGE_CDN_URL;

		if (!storageZone || !storageAccessKey || !cdnBaseUrl) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Avatar storage is not configured.",
			});
		}

		const extension = AVATAR_MIME_MAP[mimeType];
		if (!extension) {
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
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to generate upload URL.",
		});
	}
}
