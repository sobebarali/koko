import { z } from "zod";

export const deleteCommentInput = z.object({
	id: z.string().min(1),
});
