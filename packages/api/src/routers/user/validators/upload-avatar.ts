import { z } from "zod";
import { AVATAR_MAX_FILE_SIZE } from "../types/upload-avatar";

export const avatarUploadInput = z.object({
	fileName: z.string().min(1).max(255),
	fileSize: z.number().int().positive().max(AVATAR_MAX_FILE_SIZE),
	mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});
