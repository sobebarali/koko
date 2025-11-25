import { z } from "zod";
import { AVATAR_MAX_FILE_SIZE } from "./type";

export const avatarUploadInput = z.object({
	fileName: z.string().min(1).max(255),
	fileSize: z.number().int().positive().max(AVATAR_MAX_FILE_SIZE),
	mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});
