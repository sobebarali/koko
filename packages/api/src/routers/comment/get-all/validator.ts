import { z } from "zod";

export const getAllCommentsInput = z.object({
	videoId: z.string().min(1),
	resolved: z.enum(["all", "resolved", "unresolved"]).optional().default("all"),
});
