import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpc, trpcClient } from "@/utils/trpc";

export type VideoStatus = "uploading" | "processing" | "ready" | "failed";

export type VideoListItem = {
	id: string;
	projectId: string;
	uploadedBy: string;
	bunnyVideoId: string;
	title: string;
	thumbnailUrl: string | null;
	duration: number | null;
	status: VideoStatus;
	viewCount: number;
	createdAt: string;
};

export type VideoDetail = {
	id: string;
	projectId: string;
	uploadedBy: string;
	bunnyVideoId: string;
	bunnyLibraryId: string;
	title: string;
	description: string | null;
	tags: string[];
	originalFileName: string;
	fileSize: number;
	mimeType: string;
	thumbnailUrl: string | null;
	streamingUrl: string | null;
	duration: number | null;
	width: number | null;
	height: number | null;
	fps: number | null;
	status: VideoStatus;
	processingProgress: number | null;
	errorMessage: string | null;
	viewCount: number;
	commentCount: number;
	versionNumber: number;
	parentVideoId: string | null;
	isCurrentVersion: boolean;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

export function useVideos({
	projectId,
	status,
	limit = 20,
}: {
	projectId: string;
	status?: VideoStatus;
	limit?: number;
}): {
	videos: VideoListItem[];
	isLoading: boolean;
	error: unknown;
	hasMore: boolean;
	nextCursor: string | undefined;
} {
	const { data, isLoading, error } = useQuery(
		trpc.video.getAll.queryOptions({ projectId, status, limit }),
	);

	return {
		videos: (data?.videos ?? []) as VideoListItem[],
		isLoading,
		error,
		hasMore: !!data?.nextCursor,
		nextCursor: data?.nextCursor,
	};
}

export function useVideo({ id }: { id: string }): {
	video: VideoDetail | undefined;
	isLoading: boolean;
	error: unknown;
} {
	const { data, isLoading, error } = useQuery(
		trpc.video.getById.queryOptions({ id }),
	);

	return {
		video: data?.video as VideoDetail | undefined,
		isLoading,
		error,
	};
}

export type UploadCredentials = {
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

export function useCreateUpload(): {
	createUpload: (data: {
		projectId: string;
		title: string;
		description?: string;
		tags?: string[];
		fileName: string;
		fileSize: number;
		mimeType: string;
	}) => Promise<UploadCredentials>;
	isCreating: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: {
			projectId: string;
			title: string;
			description?: string;
			tags?: string[];
			fileName: string;
			fileSize: number;
			mimeType: string;
		}) => {
			return trpcClient.video.createUpload.mutate(input);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [["video", "getAll"], { projectId: variables.projectId }],
			});
		},
		onError: (error) => {
			toast.error(error.message || "Failed to initialize upload");
		},
	});

	return {
		createUpload: async (data) => {
			const result = await mutation.mutateAsync(data);
			return result as UploadCredentials;
		},
		isCreating: mutation.isPending,
	};
}

export function useUpdateVideo(): {
	updateVideo: (data: {
		id: string;
		title?: string;
		description?: string;
		tags?: string[];
	}) => Promise<void>;
	isUpdating: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: {
			id: string;
			title?: string;
			description?: string;
			tags?: string[];
		}) => {
			return trpcClient.video.updateMetadata.mutate(input);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [["video", "getById"], { id: variables.id }],
			});
			queryClient.invalidateQueries({
				queryKey: [["video", "getAll"]],
			});
			toast.success("Video updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update video");
		},
	});

	return {
		updateVideo: async (data) => {
			await mutation.mutateAsync(data);
		},
		isUpdating: mutation.isPending,
	};
}

export function useDeleteVideo(): {
	deleteVideo: (id: string) => Promise<void>;
	isDeleting: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (id: string) => {
			return trpcClient.video.delete.mutate({ id });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [["video", "getAll"]],
			});
			toast.success("Video deleted successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete video");
		},
	});

	return {
		deleteVideo: async (id) => {
			await mutation.mutateAsync(id);
		},
		isDeleting: mutation.isPending,
	};
}

export function usePlaybackUrl({ id }: { id: string }): {
	playbackUrl: string | undefined;
	thumbnailUrl: string | undefined;
	isLoading: boolean;
	error: unknown;
} {
	const { data, isLoading, error } = useQuery(
		trpc.video.getPlaybackUrl.queryOptions({ id }),
	);

	return {
		playbackUrl: data?.playbackUrl,
		thumbnailUrl: data?.thumbnailUrl ?? undefined,
		isLoading,
		error,
	};
}
