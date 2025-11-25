import { user } from "@koko/db/schema/auth";

export const privateProfileSelect = {
	id: user.id,
	email: user.email,
	name: user.name,
	emailVerified: user.emailVerified,
	image: user.image,
	bio: user.bio,
	title: user.title,
	company: user.company,
	location: user.location,
	website: user.website,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
};

export const publicProfileSelect = {
	id: user.id,
	name: user.name,
	image: user.image,
	bio: user.bio,
	title: user.title,
	company: user.company,
	location: user.location,
	website: user.website,
};
