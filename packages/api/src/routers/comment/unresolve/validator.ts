import { z } from "zod";

export const unresolveCommentInput = z.object({
	id: z.string().min(1, "Comment ID is required"),
});
