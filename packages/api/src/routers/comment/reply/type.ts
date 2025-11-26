export type ReplyToCommentInput = {
	parentId: string;
	text: string;
	mentions?: string[];
};

export type ReplyToCommentOutput = {
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
