export interface UpdateThumbnailInput {
	id: string;
	mode: "image" | "timestamp";
	imageBase64?: string;
	timestamp?: number;
}

export interface UpdateThumbnailOutput {
	success: boolean;
	thumbnailUrl: string | null;
}
