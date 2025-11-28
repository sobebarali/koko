export type GetByIdInput = {
	id: string;
};

export type VideoDetail = {
	id: string;
	projectId: string;
	uploadedBy: string;
	bunnyVideoId: string;
	bunnyLibraryId: string;
	title: string;
	description: string | null;
	tags: string[];
	originalFileName: string;
	fileSize: number;
	mimeType: string;
	duration: number;
	width: number;
	height: number;
	fps: number;
	status: "uploading" | "processing" | "ready" | "failed";
	processingProgress: number | null;
	errorMessage: string | null;
	streamingUrl: string | null;
	thumbnailUrl: string | null;
	viewCount: number;
	commentCount: number;
	versionNumber: number;
	parentVideoId: string | null;
	isCurrentVersion: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type GetByIdOutput = {
	video: VideoDetail;
};
