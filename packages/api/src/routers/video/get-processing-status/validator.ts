import { z } from "zod";

export const getProcessingStatusInput = z.object({
	id: z.string().min(1, "Video ID is required"),
});
