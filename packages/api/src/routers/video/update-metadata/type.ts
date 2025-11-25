export type UpdateMetadataInput = {
	id: string;
	title?: string;
	description?: string;
	tags?: string[];
};

export type UpdateMetadataOutput = {
	video: {
		id: string;
		title: string;
		description: string | null;
		tags: string[];
		updatedAt: Date;
	};
};
