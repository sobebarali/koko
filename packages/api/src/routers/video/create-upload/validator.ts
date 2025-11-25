import { z } from "zod";

export const createUploadInput = z.object({
	projectId: z.string().min(1),
	title: z.string().min(1).max(200).trim(),
	description: z.string().max(2000).optional(),
	tags: z.array(z.string().max(50)).max(10).optional(),
	fileName: z.string().min(1),
	fileSize: z.number().positive(),
	mimeType: z.string().regex(/^video\//, "Must be a video MIME type"),
});
