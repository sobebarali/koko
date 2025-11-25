import { z } from "zod";

export const updateProjectInput = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1).max(200).trim().optional(),
		description: z.string().max(2000).optional(),
		color: z.string().optional(),
		status: z.enum(["active", "archived"]).optional(),
	})
	.refine(
		(input) => {
			const { id: _id, ...rest } = input;
			return Object.values(rest).some((value) => value !== undefined);
		},
		{
			message: "At least one field must be provided to update.",
			path: [],
		},
	);
