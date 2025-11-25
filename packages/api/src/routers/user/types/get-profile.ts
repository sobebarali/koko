export type PrivateProfile = {
	id: string;
	email: string;
	name: string;
	emailVerified: boolean;
	image: string | null;
	bio: string | null;
	title: string | null;
	company: string | null;
	location: string | null;
	website: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type GetProfileOutput = {
	user: PrivateProfile;
};
