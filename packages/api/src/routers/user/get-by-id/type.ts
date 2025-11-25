export type PublicProfile = {
	id: string;
	name: string;
	image: string | null;
	bio: string | null;
	title: string | null;
	company: string | null;
	location: string | null;
	website: string | null;
};

export type GetByIdInput = {
	id: string;
};

export type GetByIdOutput = {
	user: PublicProfile;
};
