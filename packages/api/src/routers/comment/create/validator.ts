import { z } from "zod";

export const createCommentInput = z.object({
	videoId: z.string().min(1),
	text: z.string().min(1).max(2000).trim(),
	timecode: z.number().int().min(0),
	mentions: z.array(z.string()).optional().default([]),
});
