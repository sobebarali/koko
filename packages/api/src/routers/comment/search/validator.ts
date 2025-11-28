import { z } from "zod";

export const searchCommentsInput = z.object({
	videoId: z.string().min(1, "Video ID is required"),
	searchText: z.string().optional(),
	authorId: z.string().optional(),
	timecodeRange: z
		.object({
			start: z.number().int().min(0),
			end: z.number().int().min(0),
		})
		.refine((range) => range.start <= range.end, {
			message: "Start timecode must be less than or equal to end timecode",
		})
		.optional(),
	mentionedUserId: z.string().optional(),
	limit: z.number().int().min(1).max(100).default(50),
	cursor: z.string().optional(),
});
