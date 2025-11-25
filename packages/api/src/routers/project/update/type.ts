export type UpdateProjectInput = {
	id: string;
	name?: string;
	description?: string;
	color?: string;
	status?: "active" | "archived";
};

export type UpdateProjectOutput = {
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
