import type { z } from "zod";
import type { searchCommentsInput } from "./validator";

export type SearchCommentsInput = z.infer<typeof searchCommentsInput>;

export interface SearchCommentsOutput {
	comments: Array<{
		id: string;
		videoId: string;
		authorId: string;
		text: string;
		timecode: number;
		parentId: string | null;
		replyCount: number;
		resolved: boolean;
		resolvedAt: Date | null;
		resolvedBy: string | null;
		edited: boolean;
		editedAt: Date | null;
		mentions: string[];
		createdAt: Date;
		updatedAt: Date;
		author: {
			id: string;
			name: string;
			email: string;
			image: string | null;
		};
	}>;
	nextCursor: string | null;
}
