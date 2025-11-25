import { z } from "zod";

export const updateMetadataInput = z
	.object({
		id: z.string().min(1),
		title: z.string().min(1).max(200).trim().optional(),
		description: z.string().max(2000).optional(),
		tags: z.array(z.string().max(50)).max(10).optional(),
	})
	.refine(
		(data) =>
			data.title !== undefined ||
			data.description !== undefined ||
			data.tags !== undefined,
		{ message: "At least one field must be provided" },
	);
