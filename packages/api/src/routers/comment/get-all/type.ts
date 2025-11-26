export type GetAllCommentsInput = {
	videoId: string;
	resolved?: "all" | "resolved" | "unresolved";
};

export type CommentAuthor = {
	id: string;
	name: string;
	image: string | null;
};

export type CommentWithReplies = {
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
	author: CommentAuthor;
	replies: CommentReply[];
};

export type CommentReply = {
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
	author: CommentAuthor;
};

export type GetAllCommentsOutput = {
	comments: CommentWithReplies[];
};
