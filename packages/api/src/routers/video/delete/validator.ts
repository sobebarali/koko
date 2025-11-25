import { z } from "zod";

export const deleteInput = z.object({
	id: z.string().min(1),
});
