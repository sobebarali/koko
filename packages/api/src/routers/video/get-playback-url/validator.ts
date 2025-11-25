import { z } from "zod";

export const getPlaybackUrlInput = z.object({
	id: z.string().min(1),
});
