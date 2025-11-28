import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpc, trpcClient } from "@/utils/trpc";

export type CommentAuthor = {
	id: string;
	name: string;
	image: string | null;
};

export type CommentReply = {
	id: string;
	videoId: string;
	authorId: string;
	text: string;
	timecode: number;
	parentId: string | null;
	replyCount: number;
	resolved: boolean;
	resolvedAt: string | null;
	resolvedBy: string | null;
	edited: boolean;
	editedAt: string | null;
	mentions: string[];
	createdAt: string;
	updatedAt: string;
	author: CommentAuthor;
};

export type CommentWithReplies = {
	id: string;
	videoId: string;
	authorId: string;
	text: string;
	timecode: number;
	parentId: string | null;
	replyCount: number;
	resolved: boolean;
	resolvedAt: string | null;
	resolvedBy: string | null;
	edited: boolean;
	editedAt: string | null;
	mentions: string[];
	createdAt: string;
	updatedAt: string;
	author: CommentAuthor;
	replies: CommentReply[];
};

export type ResolvedFilter = "all" | "resolved" | "unresolved";

export function useComments({
	videoId,
	resolved = "all",
}: {
	videoId: string;
	resolved?: ResolvedFilter;
}): {
	comments: CommentWithReplies[];
	isLoading: boolean;
	error: unknown;
} {
	const { data, isLoading, error } = useQuery(
		trpc.comment.getAll.queryOptions({ videoId, resolved }),
	);

	return {
		comments: (data?.comments ?? []) as CommentWithReplies[],
		isLoading,
		error,
	};
}

export function useCreateComment(): {
	createComment: (data: {
		videoId: string;
		text: string;
		timecode: number;
		mentions?: string[];
	}) => Promise<{ id: string }>;
	isCreating: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: {
			videoId: string;
			text: string;
			timecode: number;
			mentions?: string[];
		}) => {
			return trpcClient.comment.create.mutate(input);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [
					["comment", "getAll"],
					{ input: { videoId: variables.videoId } },
				],
			});
			queryClient.invalidateQueries({
				queryKey: [["video", "getById"], { input: { id: variables.videoId } }],
			});
			toast.success("Comment added");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to add comment");
		},
	});

	return {
		createComment: async (data) => {
			const result = await mutation.mutateAsync(data);
			return { id: result.comment.id };
		},
		isCreating: mutation.isPending,
	};
}

export function useReplyToComment(): {
	replyToComment: (data: {
		parentId: string;
		text: string;
		mentions?: string[];
	}) => Promise<{ id: string }>;
	isReplying: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: {
			parentId: string;
			text: string;
			mentions?: string[];
		}) => {
			return trpcClient.comment.reply.mutate(input);
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({
				queryKey: [
					["comment", "getAll"],
					{ input: { videoId: result.comment.videoId } },
				],
			});
			toast.success("Reply added");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to add reply");
		},
	});

	return {
		replyToComment: async (data) => {
			const result = await mutation.mutateAsync(data);
			return { id: result.comment.id };
		},
		isReplying: mutation.isPending,
	};
}

export function useUpdateComment(): {
	updateComment: (data: { id: string; text: string }) => Promise<void>;
	isUpdating: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: { id: string; text: string }) => {
			return trpcClient.comment.update.mutate(input);
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({
				queryKey: [
					["comment", "getAll"],
					{ input: { videoId: result.comment.videoId } },
				],
			});
			toast.success("Comment updated");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update comment");
		},
	});

	return {
		updateComment: async (data) => {
			await mutation.mutateAsync(data);
		},
		isUpdating: mutation.isPending,
	};
}

export function useDeleteComment(): {
	deleteComment: (id: string) => Promise<void>;
	isDeleting: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (id: string) => {
			return trpcClient.comment.delete.mutate({ id });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [["comment", "getAll"]],
			});
			toast.success("Comment deleted");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete comment");
		},
	});

	return {
		deleteComment: async (id) => {
			await mutation.mutateAsync(id);
		},
		isDeleting: mutation.isPending,
	};
}

export function useResolveComment(): {
	resolveComment: (data: { id: string; resolved: boolean }) => Promise<void>;
	isResolving: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: { id: string; resolved: boolean }) => {
			return trpcClient.comment.resolve.mutate(input);
		},
		onSuccess: (result, variables) => {
			queryClient.invalidateQueries({
				queryKey: [
					["comment", "getAll"],
					{ input: { videoId: result.comment.videoId } },
				],
			});
			toast.success(
				variables.resolved ? "Comment resolved" : "Comment reopened",
			);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update comment status");
		},
	});

	return {
		resolveComment: async (data) => {
			await mutation.mutateAsync(data);
		},
		isResolving: mutation.isPending,
	};
}

export function useUnresolveComment(): {
	unresolveComment: (data: { id: string }) => Promise<void>;
	isUnresolving: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: { id: string }) => {
			return trpcClient.comment.unresolve.mutate(input);
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({
				queryKey: [
					["comment", "getAll"],
					{ input: { videoId: result.comment.videoId } },
				],
			});
			toast.success("Comment reopened");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to reopen comment");
		},
	});

	return {
		unresolveComment: async (data) => {
			await mutation.mutateAsync(data);
		},
		isUnresolving: mutation.isPending,
	};
}

export type SearchCommentsInput = {
	videoId: string;
	searchText?: string;
	authorId?: string;
	timecodeRange?: { start: number; end: number };
	mentionedUserId?: string;
	limit?: number;
	cursor?: string;
};

export type SearchCommentResult = {
	id: string;
	videoId: string;
	authorId: string;
	text: string;
	timecode: number;
	parentId: string | null;
	replyCount: number;
	resolved: boolean;
	resolvedAt: string | null;
	resolvedBy: string | null;
	edited: boolean;
	editedAt: string | null;
	mentions: string[];
	createdAt: string;
	updatedAt: string;
	author: CommentAuthor;
};

export function useSearchComments({
	videoId,
	searchText,
	authorId,
	timecodeRange,
	mentionedUserId,
	limit = 50,
	cursor,
	enabled = true,
}: SearchCommentsInput & { enabled?: boolean }): {
	comments: SearchCommentResult[];
	isSearching: boolean;
	error: unknown;
	nextCursor: string | null;
} {
	const { data, isLoading, error } = useQuery({
		...trpc.comment.search.queryOptions({
			videoId,
			searchText,
			authorId,
			timecodeRange,
			mentionedUserId,
			limit,
			cursor,
		}),
		enabled: enabled && !!videoId,
	});

	return {
		comments: (data?.comments ?? []) as SearchCommentResult[],
		isSearching: isLoading,
		error,
		nextCursor: data?.nextCursor ?? null,
	};
}
