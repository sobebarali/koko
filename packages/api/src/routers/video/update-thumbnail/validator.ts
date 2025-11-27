import { z } from "zod";

export const updateThumbnailInput = z
	.object({
		id: z.string().min(1, "Video ID is required"),
		mode: z.enum(["image", "timestamp"]),
		imageBase64: z.string().optional(),
		timestamp: z.number().min(0).optional(),
	})
	.refine(
		(data) =>
			(data.mode === "image" && data.imageBase64) ||
			(data.mode === "timestamp" && data.timestamp !== undefined),
		{
			message:
				"Provide imageBase64 for image mode or timestamp for timestamp mode",
		},
	);
