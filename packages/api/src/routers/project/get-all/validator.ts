import { z } from "zod";

export const getAllInput = z.object({
	status: z.enum(["active", "archived"]).optional().default("active"),
	limit: z.number().min(1).max(100).optional().default(20),
	cursor: z.string().optional(),
});
