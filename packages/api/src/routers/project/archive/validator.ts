import { z } from "zod";

export const archiveProjectInput = z.object({
	id: z.string().min(1),
});
