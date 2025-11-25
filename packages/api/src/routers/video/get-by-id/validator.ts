import { z } from "zod";

export const getByIdInput = z.object({
	id: z.string().min(1),
});
