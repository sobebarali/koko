import { z } from "zod";

export const deleteProjectInput = z.object({
	id: z.string().min(1),
});
