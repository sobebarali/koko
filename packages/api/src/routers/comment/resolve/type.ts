export type ResolveCommentInput = {
	id: string;
	resolved: boolean;
};

export type ResolveCommentOutput = {
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
};
