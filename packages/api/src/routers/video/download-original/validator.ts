import { z } from "zod";

export const downloadOriginalInput = z.object({
	id: z.string().min(1, "Video ID is required"),
	expiresIn: z.number().min(300).max(86400).default(3600), // 5min to 24hrs, default 1hr
});
