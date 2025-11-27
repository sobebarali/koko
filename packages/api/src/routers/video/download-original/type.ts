export interface DownloadOriginalInput {
	id: string;
	expiresIn?: number;
}

export interface DownloadOriginalOutput {
	downloadUrl: string;
	expiresAt: string;
}
