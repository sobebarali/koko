export interface GetProcessingStatusInput {
	id: string;
}

export interface GetProcessingStatusOutput {
	status: "uploading" | "processing" | "ready" | "failed";
	progress: number | null;
	errorMessage: string | null;
	resolution: string | null;
	duration: number | null;
}
