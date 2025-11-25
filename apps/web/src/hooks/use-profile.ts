import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpc, trpcClient } from "@/utils/trpc";

export function useProfile(): {
	profile:
		| {
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
				createdAt: string;
				updatedAt: string;
		  }
		| undefined;
	isLoading: boolean;
	error: unknown;
} {
	const { data, isLoading, error } = useQuery(
		trpc.user.getProfile.queryOptions(),
	);

	return { profile: data?.user, isLoading, error };
}

export function useUpdateProfile(): {
	updateProfile: (data: {
		name?: string;
		bio?: string;
		title?: string;
		company?: string;
		location?: string;
		website?: string;
	}) => Promise<void>;
	isUpdating: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (input: {
			name?: string;
			bio?: string;
			title?: string;
			company?: string;
			location?: string;
			website?: string;
		}) => {
			return trpcClient.user.updateProfile.mutate(input);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["user", "getProfile"]] });
			toast.success("Profile updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update profile");
		},
	});

	return {
		updateProfile: async (data) => {
			await mutation.mutateAsync(data);
		},
		isUpdating: mutation.isPending,
	};
}

export function useUploadAvatar(): {
	uploadAvatar: (file: File) => Promise<string>;
	isUploading: boolean;
} {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (file: File) => {
			// Get presigned URL from API
			const { uploadUrl, uploadHeaders, avatarUrl } =
				await trpcClient.user.uploadAvatar.mutate({
					fileName: file.name,
					fileSize: file.size,
					mimeType: file.type as
						| "image/jpeg"
						| "image/png"
						| "image/webp"
						| "image/gif",
				});

			// Upload to BunnyCDN
			const uploadResponse = await fetch(uploadUrl, {
				method: "PUT",
				headers: uploadHeaders,
				body: file,
			});

			if (!uploadResponse.ok) {
				throw new Error("Failed to upload image to CDN");
			}

			return avatarUrl;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [["user", "getProfile"]] });
			toast.success("Avatar updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to upload avatar");
		},
	});

	return {
		uploadAvatar: async (file) => {
			return mutation.mutateAsync(file);
		},
		isUploading: mutation.isPending,
	};
}
