export type RestoreProjectInput = {
	id: string;
};

export type RestoreProjectOutput = {
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
};
