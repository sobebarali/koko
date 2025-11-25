export type CreateProjectInput = {
	name: string;
	description?: string;
	color?: string;
};

export type CreateProjectOutput = {
	project: {
		id: string;
		name: string;
		description: string | null;
		ownerId: string;
		status: "active" | "archived" | "deleted";
		color: string | null;
		thumbnail: string | null;
		videoCount: number;
		memberCount: number;
		commentCount: number;
		createdAt: Date;
		updatedAt: Date;
	};
};
