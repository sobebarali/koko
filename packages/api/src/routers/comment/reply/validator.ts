import { z } from "zod";

export const replyToCommentInput = z.object({
	parentId: z.string().min(1),
	text: z.string().min(1).max(2000).trim(),
	mentions: z.array(z.string()).optional().default([]),
});
