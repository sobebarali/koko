export type DuplicateProjectInput = {
	id: string;
	name?: string;
};

export type DuplicateProjectOutput = {
	project: {
		id: string;
		name: string;
		description: string | null;
		ownerId: string;
		status: "active" | "archived";
		color: string | null;
		thumbnail: string | null;
		bunnyCollectionId: string | null;
		videoCount: number;
		memberCount: number;
		commentCount: number;
		createdAt: Date;
		updatedAt: Date;
	};
	copiedVideos: number;
	copiedMembers: number;
};
