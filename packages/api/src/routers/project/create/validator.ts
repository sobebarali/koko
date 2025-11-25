import { z } from "zod";

export const createProjectInput = z.object({
	name: z.string().min(1).max(200).trim(),
	description: z.string().max(2000).optional(),
	color: z.string().optional(),
});
