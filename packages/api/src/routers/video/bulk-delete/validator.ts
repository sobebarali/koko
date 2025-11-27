import { z } from "zod";

export const bulkDeleteInput = z.object({
	ids: z
		.array(z.string().min(1))
		.min(1, "At least one video ID is required")
		.max(50, "Maximum 50 videos can be deleted at once"),
});
