export interface UpdateThumbnailInput {
	id: string;
	imageBase64: string;
}

export interface UpdateThumbnailOutput {
	success: boolean;
	thumbnailUrl: string | null;
}
