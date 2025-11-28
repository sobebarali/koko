export type GetByIdInput = {
	id: string;
};

export type ProjectDetail = {
	id: string;
	name: string;
	description: string | null;
	ownerId: string;
	status: "active" | "archived";
	color: string | null;
	thumbnail: string | null;
	videoCount: number;
	memberCount: number;
	commentCount: number;
	createdAt: Date;
	updatedAt: Date;
	owner: {
		id: string;
		name: string;
		image: string | null;
	};
};

export type GetByIdOutput = {
	project: ProjectDetail;
};
