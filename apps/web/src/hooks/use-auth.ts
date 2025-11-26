import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { trpcClient } from "@/utils/trpc";

export function useVerifyEmail(): {
	verifyEmail: (token: string) => Promise<void>;
	isVerifying: boolean;
	isSuccess: boolean;
	error: Error | null;
} {
	const navigate = useNavigate();

	const mutation = useMutation({
		mutationFn: async (token: string) => {
			return trpcClient.auth.verifyEmail.mutate({ token });
		},
		onSuccess: () => {
			toast.success("Email verified successfully!");
			setTimeout(() => {
				navigate({ to: "/login" });
			}, 2000);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to verify email");
		},
	});

	return {
		verifyEmail: async (token) => {
			await mutation.mutateAsync(token);
		},
		isVerifying: mutation.isPending,
		isSuccess: mutation.isSuccess,
		error: mutation.error,
	};
}

export function useRequestPasswordReset(): {
	requestReset: (email: string) => Promise<void>;
	isRequesting: boolean;
	isSuccess: boolean;
} {
	const mutation = useMutation({
		mutationFn: async (email: string) => {
			return trpcClient.auth.requestPasswordReset.mutate({ email });
		},
		onSuccess: () => {
			toast.success(
				"If an account exists, a password reset link has been sent",
			);
		},
		onError: () => {
			// Still show success to prevent user enumeration
			toast.success(
				"If an account exists, a password reset link has been sent",
			);
		},
	});

	return {
		requestReset: async (email) => {
			await mutation.mutateAsync(email);
		},
		isRequesting: mutation.isPending,
		isSuccess: mutation.isSuccess,
	};
}

export function useResetPassword(): {
	resetPassword: (token: string, newPassword: string) => Promise<void>;
	isResetting: boolean;
	isSuccess: boolean;
	error: Error | null;
} {
	const navigate = useNavigate();

	const mutation = useMutation({
		mutationFn: async ({
			token,
			newPassword,
		}: {
			token: string;
			newPassword: string;
		}) => {
			return trpcClient.auth.resetPassword.mutate({ token, newPassword });
		},
		onSuccess: () => {
			toast.success("Password reset successfully!");
			setTimeout(() => {
				navigate({ to: "/login" });
			}, 2000);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to reset password");
		},
	});

	return {
		resetPassword: async (token, newPassword) => {
			await mutation.mutateAsync({ token, newPassword });
		},
		isResetting: mutation.isPending,
		isSuccess: mutation.isSuccess,
		error: mutation.error,
	};
}

export function useChangePassword(): {
	changePassword: (
		currentPassword: string,
		newPassword: string,
		revokeOtherSessions?: boolean,
	) => Promise<void>;
	isChanging: boolean;
	isSuccess: boolean;
	error: Error | null;
} {
	const mutation = useMutation({
		mutationFn: async ({
			currentPassword,
			newPassword,
			revokeOtherSessions = true,
		}: {
			currentPassword: string;
			newPassword: string;
			revokeOtherSessions?: boolean;
		}) => {
			return trpcClient.auth.changePassword.mutate({
				currentPassword,
				newPassword,
				revokeOtherSessions,
			});
		},
		onSuccess: () => {
			toast.success("Password changed successfully!");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to change password");
		},
	});

	return {
		changePassword: async (
			currentPassword,
			newPassword,
			revokeOtherSessions,
		) => {
			await mutation.mutateAsync({
				currentPassword,
				newPassword,
				revokeOtherSessions,
			});
		},
		isChanging: mutation.isPending,
		isSuccess: mutation.isSuccess,
		error: mutation.error,
	};
}
