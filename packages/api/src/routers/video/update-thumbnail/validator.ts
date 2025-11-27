import { z } from "zod";

export const updateThumbnailInput = z.object({
	id: z.string().min(1, "Video ID is required"),
	imageBase64: z.string().min(1, "Image data is required"),
});
