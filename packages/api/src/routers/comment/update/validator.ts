import { z } from "zod";

export const updateCommentInput = z.object({
	id: z.string().min(1),
	text: z.string().min(1).max(2000).trim(),
});
