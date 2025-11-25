import { z } from "zod";

export const getAllInput = z.object({
	projectId: z.string().min(1),
	status: z.enum(["uploading", "processing", "ready", "failed"]).optional(),
	limit: z.number().min(1).max(100).default(20),
	cursor: z.string().optional(),
});
