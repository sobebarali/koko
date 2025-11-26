import { user } from "@koko/db/schema/auth";
import { comment } from "@koko/db/schema/comment";

export const commentSelect = {
	id: comment.id,
	videoId: comment.videoId,
	authorId: comment.authorId,
	text: comment.text,
	timecode: comment.timecode,
	parentId: comment.parentId,
	replyCount: comment.replyCount,
	resolved: comment.resolved,
	resolvedAt: comment.resolvedAt,
	resolvedBy: comment.resolvedBy,
	edited: comment.edited,
	editedAt: comment.editedAt,
	mentions: comment.mentions,
	createdAt: comment.createdAt,
	updatedAt: comment.updatedAt,
};

export const authorSelect = {
	id: user.id,
	name: user.name,
	image: user.image,
};
