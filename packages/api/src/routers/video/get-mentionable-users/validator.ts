import { z } from "zod";

export const getMentionableUsersInput = z.object({
	videoId: z.string().min(1, "Video ID is required"),
});
