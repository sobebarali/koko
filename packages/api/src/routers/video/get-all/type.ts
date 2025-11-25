export type GetAllInput = {
	projectId: string;
	status?: "uploading" | "processing" | "ready" | "failed";
	limit: number;
	cursor?: string;
};

export type VideoListItem = {
	id: string;
	projectId: string;
	uploadedBy: string;
	bunnyVideoId: string;
	title: string;
	thumbnailUrl: string | null;
	duration: number;
	status: "uploading" | "processing" | "ready" | "failed";
	viewCount: number;
	createdAt: Date;
};

export type GetAllOutput = {
	videos: VideoListItem[];
	nextCursor?: string;
};
