import type { z } from "zod";
import type { unresolveCommentInput } from "./validator";

export type UnresolveCommentInput = z.infer<typeof unresolveCommentInput>;

export interface UnresolveCommentOutput {
	comment: {
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
	};
}
