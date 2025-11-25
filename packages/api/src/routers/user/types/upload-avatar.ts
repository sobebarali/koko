import type { z } from "zod";
import type { avatarUploadInput } from "../validators/upload-avatar";

export const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const AVATAR_MIME_MAP = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
} as const;

export type AvatarMimeType = keyof typeof AVATAR_MIME_MAP;

export type AvatarUploadInput = z.infer<typeof avatarUploadInput>;

export type AvatarUploadOutput = {
	uploadUrl: string;
	uploadHeaders: {
		AccessKey: string;
		"Content-Type": AvatarMimeType;
	};
	avatarUrl: string;
};
