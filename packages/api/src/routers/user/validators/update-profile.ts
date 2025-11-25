import { z } from "zod";

export const updateProfileInput = z
	.object({
		name: z.string().min(1).max(100).trim().optional(),
		bio: z.string().max(500).optional(),
		title: z.string().max(100).optional(),
		company: z.string().max(100).optional(),
		location: z.string().max(100).optional(),
		website: z.string().url().optional(),
	})
	.refine(
		(input) => Object.values(input).some((value) => value !== undefined),
		{
			message: "At least one field must be provided.",
			path: [],
		},
	);
