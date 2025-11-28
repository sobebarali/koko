import { project } from "@koko/db/schema/project";

export const projectListSelect = {
	id: project.id,
	name: project.name,
	description: project.description,
	ownerId: project.ownerId,
	status: project.status,
	color: project.color,
	thumbnail: project.thumbnail,
	bunnyCollectionId: project.bunnyCollectionId,
	videoCount: project.videoCount,
	memberCount: project.memberCount,
	commentCount: project.commentCount,
	createdAt: project.createdAt,
	updatedAt: project.updatedAt,
};

export const projectDetailSelect = {
	...projectListSelect,
};
