import { z } from "zod";

export const resolveCommentInput = z.object({
	id: z.string().min(1),
	resolved: z.boolean(),
});
