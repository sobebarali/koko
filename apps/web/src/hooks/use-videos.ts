import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc, trpcClient } from "@/utils/trpc";

// Track video statuses across renders to detect changes
const videoStatusCache = new Map<string, VideoStatus>();

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
	const queryClient = useQueryClient();
	const initialLoadRef = useRef(true);

	const { data, isLoading, error } = useQuery({
		...trpc.video.getAll.queryOptions({ projectId, status, limit }),
		refetchInterval: (query) => {
			const videos = query.state.data?.videos;
			if (
				videos?.some(
					(v) => v.status === "processing" || v.status === "uploading",
				)
			) {
				return 2000;
			}
			return false;
		},
	});

	// Track status changes and show toast notifications
	useEffect(() => {
		if (!data?.videos) return;

		// Skip notifications on initial load
		if (initialLoadRef.current) {
			// Just populate the cache on first load
			for (const video of data.videos) {
				videoStatusCache.set(video.id, video.status as VideoStatus);
			}
			initialLoadRef.current = false;
			return;
		}

		for (const video of data.videos) {
			const prevStatus = videoStatusCache.get(video.id);
			const currentStatus = video.status as VideoStatus;

			// Only notify on actual status changes (not initial load)
			if (prevStatus && prevStatus !== currentStatus) {
				if (currentStatus === "ready") {
					toast.success(`"${video.title}" is ready to play!`);
					// Invalidate to get updated metadata
					queryClient.invalidateQueries({
						queryKey: [["video", "getById"], { id: video.id }],
					});
				} else if (currentStatus === "failed") {
					toast.error(`"${video.title}" processing failed`);
				}
			}

			videoStatusCache.set(video.id, currentStatus);
		}
	}, [data?.videos, queryClient]);

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
		onSuccess: () => {
			// Invalidate all video.getAll queries regardless of params
			queryClient.invalidateQueries({
				queryKey: [["video", "getAll"]],
			});
			// Also invalidate project queries to update videoCount
			queryClient.invalidateQueries({
				queryKey: [["project", "getById"]],
			});
			queryClient.invalidateQueries({
				queryKey: [["project", "getAll"]],
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
			// Also invalidate project queries to update videoCount
			queryClient.invalidateQueries({
				queryKey: [["project", "getById"]],
			});
			queryClient.invalidateQueries({
				queryKey: [["project", "getAll"]],
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

export function useUpdateThumbnail(): {
	updateThumbnail: (data: { id: string; imageBase64: string }) => Promise<void>;
	isUpdating: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: { id: string; imageBase64: string }) => {
			return trpcClient.video.updateThumbnail.mutate(input);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [["video", "getById"], { id: variables.id }],
			});
			queryClient.invalidateQueries({
				queryKey: [["video", "getAll"]],
			});
			toast.success("Thumbnail updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update thumbnail");
		},
	});

	return {
		updateThumbnail: async (data) => {
			await mutation.mutateAsync(data);
		},
		isUpdating: mutation.isPending,
	};
}

export function useProcessingStatus({
	id,
	enabled = true,
}: {
	id: string;
	enabled?: boolean;
}): {
	status: VideoStatus | undefined;
	progress: number | undefined;
	isLoading: boolean;
	error: unknown;
} {
	const queryClient = useQueryClient();
	const { data, isLoading, error } = useQuery({
		...trpc.video.getProcessingStatus.queryOptions({ id }),
		enabled,
		refetchInterval: (query) => {
			const status = query.state.data?.status;
			if (status === "processing" || status === "uploading") {
				return 1000; // Poll every 1s. Drawback: Increased server load and network traffic.
			}
			return false;
		},
	});

	useEffect(() => {
		// When video reaches final state, force immediate refetch to update UI
		if (data?.status === "ready" || data?.status === "failed") {
			// Use refetchQueries instead of invalidateQueries for immediate update
			queryClient.refetchQueries({
				queryKey: [["video", "getAll"]],
			});
			queryClient.refetchQueries({
				queryKey: [["video", "getById"], { id }],
			});
		}
	}, [data?.status, queryClient, id]);

	return {
		status: data?.status as VideoStatus | undefined,
		progress: data?.progress ?? undefined,
		isLoading,
		error,
	};
}

export function useAddCaptions(): {
	addCaptions: (data: {
		id: string;
		srclang: string;
		label?: string;
		captionFile: string;
	}) => Promise<void>;
	isAdding: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: {
			id: string;
			srclang: string;
			label?: string;
			captionFile: string;
		}) => {
			return trpcClient.video.addCaptions.mutate(input);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [["video", "getById"], { id: variables.id }],
			});
			toast.success("Captions uploaded successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to upload captions");
		},
	});

	return {
		addCaptions: async (data) => {
			await mutation.mutateAsync(data);
		},
		isAdding: mutation.isPending,
	};
}

export function useDownloadOriginal(): {
	getDownloadUrl: (id: string) => Promise<string>;
	isLoading: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (id: string) => {
			const result = await queryClient.fetchQuery(
				trpc.video.downloadOriginal.queryOptions({ id }),
			);
			return result.downloadUrl;
		},
		onError: (error) => {
			toast.error(error.message || "Failed to get download URL");
		},
	});

	return {
		getDownloadUrl: async (id) => {
			return mutation.mutateAsync(id);
		},
		isLoading: mutation.isPending,
	};
}

export function useBulkDeleteVideos(): {
	bulkDeleteVideos: (ids: string[]) => Promise<void>;
	isDeleting: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (ids: string[]) => {
			return trpcClient.video.bulkDelete.mutate({ ids });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [["video", "getAll"]],
			});
			queryClient.invalidateQueries({
				queryKey: [["project", "getById"]],
			});
			queryClient.invalidateQueries({
				queryKey: [["project", "getAll"]],
			});
			toast.success("Videos deleted successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete videos");
		},
	});

	return {
		bulkDeleteVideos: async (ids) => {
			await mutation.mutateAsync(ids);
		},
		isDeleting: mutation.isPending,
	};
}

export type MentionableUser = {
	id: string;
	name: string;
	email: string;
	image: string | null;
};

export function useMentionableUsers({ videoId }: { videoId: string }): {
	users: MentionableUser[];
	isLoading: boolean;
	error: unknown;
} {
	const { data, isLoading, error } = useQuery({
		...trpc.video.getMentionableUsers.queryOptions({ videoId }),
		enabled: !!videoId,
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	});

	return {
		users: (data?.users ?? []) as MentionableUser[],
		isLoading,
		error,
	};
}
