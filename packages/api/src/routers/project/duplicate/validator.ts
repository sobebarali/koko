import { z } from "zod";

export const duplicateProjectInput = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(200).trim().optional(),
});
