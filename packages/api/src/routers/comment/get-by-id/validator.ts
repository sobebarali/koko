import { z } from "zod";

export const getCommentByIdInput = z.object({
	id: z.string().min(1),
});
