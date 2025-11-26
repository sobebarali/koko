import type { CommentReply, CommentWithReplies } from "../get-all/type";

export type GetCommentByIdInput = {
	id: string;
};

export type GetCommentByIdOutput = {
	comment: CommentWithReplies;
};

export type { CommentReply, CommentWithReplies };
