export type CreateUploadInput = {
	projectId: string;
	title: string;
	description?: string;
	tags?: string[];
	fileName: string;
	fileSize: number;
	mimeType: string;
};

export type CreateUploadOutput = {
	video: {
		id: string;
		bunnyVideoId: string;
		status: "uploading";
	};
	upload: {
		endpoint: string;
		headers: {
			AuthorizationSignature: string;
			AuthorizationExpire: number;
			VideoId: string;
			LibraryId: string;
		};
		metadata: {
			filetype: string;
			title: string;
		};
	};
};
