import { z } from "zod";

export const restoreProjectInput = z.object({
	id: z.string().min(1),
});
