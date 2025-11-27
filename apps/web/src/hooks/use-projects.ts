import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpc, trpcClient } from "@/utils/trpc";

export type Project = {
	id: string;
	name: string;
	description: string | null;
	ownerId: string;
	status: "active" | "archived" | "deleted";
	color: string | null;
	thumbnail: string | null;
	videoCount: number;
	memberCount: number;
	commentCount: number;
	createdAt: string;
	updatedAt: string;
	role: "owner" | "editor" | "reviewer" | "viewer";
};

export type ProjectDetail = {
	id: string;
	name: string;
	description: string | null;
	ownerId: string;
	status: "active" | "archived" | "deleted";
	color: string | null;
	thumbnail: string | null;
	videoCount: number;
	memberCount: number;
	commentCount: number;
	createdAt: string;
	updatedAt: string;
	archivedAt: string | null;
	deletedAt: string | null;
	owner: {
		id: string;
		name: string;
		image: string | null;
	};
};

export function useProjects({
	status = "active",
}: {
	status?: "active" | "archived";
} = {}): {
	projects: Project[];
	isLoading: boolean;
	error: unknown;
	hasMore: boolean;
	nextCursor: string | undefined;
} {
	const { data, isLoading, error } = useQuery(
		trpc.project.getAll.queryOptions({ status, limit: 20 }),
	);

	return {
		projects: data?.projects ?? [],
		isLoading,
		error,
		hasMore: !!data?.nextCursor,
		nextCursor: data?.nextCursor,
	};
}

export function useProject({ id }: { id: string }): {
	project: ProjectDetail | undefined;
	isLoading: boolean;
	error: unknown;
} {
	const { data, isLoading, error } = useQuery(
		trpc.project.getById.queryOptions({ id }),
	);

	return {
		project: data?.project as ProjectDetail | undefined,
		isLoading,
		error,
	};
}

export function useCreateProject(): {
	createProject: (data: {
		name: string;
		description?: string;
		color?: string;
	}) => Promise<{ id: string }>;
	isCreating: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: {
			name: string;
			description?: string;
			color?: string;
		}) => {
			return trpcClient.project.create.mutate(input);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["project", "getAll"]] });
			toast.success("Project created successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create project");
		},
	});

	return {
		createProject: async (data) => {
			const result = await mutation.mutateAsync(data);
			return { id: result.project.id };
		},
		isCreating: mutation.isPending,
	};
}

export function useUpdateProject(): {
	updateProject: (data: {
		id: string;
		name?: string;
		description?: string;
		color?: string;
		status?: "active" | "archived";
	}) => Promise<void>;
	isUpdating: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: {
			id: string;
			name?: string;
			description?: string;
			color?: string;
			status?: "active" | "archived";
		}) => {
			return trpcClient.project.update.mutate(input);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: [["project", "getAll"]] });
			queryClient.invalidateQueries({
				queryKey: [["project", "getById"], { id: variables.id }],
			});
			toast.success("Project updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update project");
		},
	});

	return {
		updateProject: async (data) => {
			await mutation.mutateAsync(data);
		},
		isUpdating: mutation.isPending,
	};
}

export function useDeleteProject(): {
	deleteProject: (id: string) => Promise<void>;
	isDeleting: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (id: string) => {
			return trpcClient.project.delete.mutate({ id });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["project", "getAll"]] });
			toast.success("Project deleted successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete project");
		},
	});

	return {
		deleteProject: async (id) => {
			await mutation.mutateAsync(id);
		},
		isDeleting: mutation.isPending,
	};
}

export function useArchiveProject(): {
	archiveProject: (id: string) => Promise<void>;
	unarchiveProject: (id: string) => Promise<void>;
	isArchiving: boolean;
} {
	const queryClient = useQueryClient();

	const archiveMutation = useMutation({
		mutationFn: async (id: string) => {
			return trpcClient.project.archive.mutate({ id });
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: [["project", "getAll"]] });
			queryClient.invalidateQueries({
				queryKey: [["project", "getById"], { id }],
			});
			toast.success("Project archived successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to archive project");
		},
	});

	const restoreMutation = useMutation({
		mutationFn: async (id: string) => {
			return trpcClient.project.restore.mutate({ id });
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: [["project", "getAll"]] });
			queryClient.invalidateQueries({
				queryKey: [["project", "getById"], { id }],
			});
			toast.success("Project restored successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to restore project");
		},
	});

	return {
		archiveProject: async (id) => {
			await archiveMutation.mutateAsync(id);
		},
		unarchiveProject: async (id) => {
			await restoreMutation.mutateAsync(id);
		},
		isArchiving: archiveMutation.isPending || restoreMutation.isPending,
	};
}

export function useDuplicateProject(): {
	duplicateProject: (id: string, name?: string) => Promise<{ id: string }>;
	isDuplicating: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async ({ id, name }: { id: string; name?: string }) => {
			return trpcClient.project.duplicate.mutate({ id, name });
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: [["project", "getAll"]] });
			toast.success(
				`Project duplicated successfully (${result.copiedVideos} videos, ${result.copiedMembers} members)`,
			);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to duplicate project");
		},
	});

	return {
		duplicateProject: async (id, name) => {
			const result = await mutation.mutateAsync({ id, name });
			return { id: result.project.id };
		},
		isDuplicating: mutation.isPending,
	};
}
