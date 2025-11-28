export type GetAllInput = {
	status?: "active" | "archived";
	limit?: number;
	cursor?: string;
};

export type ProjectListItem = {
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
	role: "owner" | "editor" | "reviewer" | "viewer";
};

export type GetAllOutput = {
	projects: ProjectListItem[];
	nextCursor: string | undefined;
};
