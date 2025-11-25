import { video } from "@koko/db/schema/video";

export const videoListSelect = {
	id: video.id,
	projectId: video.projectId,
	uploadedBy: video.uploadedBy,
	bunnyVideoId: video.bunnyVideoId,
	title: video.title,
	thumbnailUrl: video.thumbnailUrl,
	duration: video.duration,
	status: video.status,
	viewCount: video.viewCount,
	createdAt: video.createdAt,
};

export const videoDetailSelect = {
	...videoListSelect,
	bunnyLibraryId: video.bunnyLibraryId,
	description: video.description,
	tags: video.tags,
	originalFileName: video.originalFileName,
	fileSize: video.fileSize,
	mimeType: video.mimeType,
	width: video.width,
	height: video.height,
	fps: video.fps,
	processingProgress: video.processingProgress,
	errorMessage: video.errorMessage,
	streamingUrl: video.streamingUrl,
	commentCount: video.commentCount,
	versionNumber: video.versionNumber,
	parentVideoId: video.parentVideoId,
	isCurrentVersion: video.isCurrentVersion,
	updatedAt: video.updatedAt,
	deletedAt: video.deletedAt,
};
