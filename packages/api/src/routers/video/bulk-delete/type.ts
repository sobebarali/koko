export interface BulkDeleteInput {
	ids: string[];
}

export interface BulkDeleteOutput {
	deleted: string[];
	failed: { id: string; reason: string }[];
}
