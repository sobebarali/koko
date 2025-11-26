import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { AlertCircle, CheckCircle, KeyRound } from "lucide-react";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/reset-password")({
	component: ResetPasswordPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			token: (search.token as string) || "",
			error: (search.error as string) || "",
		};
	},
});

function ResetPasswordPage() {
	const { token, error: urlError } = useSearch({
		from: "/auth/reset-password",
	});
	const { resetPassword, isResetting, isSuccess, error } = useResetPassword();

	const form = useForm({
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			await resetPassword(token, value.password);
		},
		validators: {
			onSubmit: z
				.object({
					password: z
						.string()
						.min(8, "Password must be at least 8 characters")
						.max(72, "Password must be at most 72 characters"),
					confirmPassword: z.string(),
				})
				.refine((data) => data.password === data.confirmPassword, {
					message: "Passwords do not match",
					path: ["confirmPassword"],
				}),
		},
	});

	// Show error if token is invalid from URL
	if (urlError === "INVALID_TOKEN" || !token) {
		return (
			<div className="mx-auto mt-10 w-full max-w-md p-6">
				<div className="text-center">
					<AlertCircle className="mx-auto h-16 w-16 text-red-500" />
					<h1 className="mt-4 font-bold text-2xl">Invalid or Expired Link</h1>
					<p className="mt-2 text-muted-foreground">
						This password reset link is invalid or has expired. Please request a
						new one.
					</p>
					<Link to="/auth/forgot-password">
						<Button className="mt-6">Request New Link</Button>
					</Link>
				</div>
			</div>
		);
	}

	if (isSuccess) {
		return (
			<div className="mx-auto mt-10 w-full max-w-md p-6">
				<div className="text-center">
					<CheckCircle className="mx-auto h-16 w-16 text-green-500" />
					<h1 className="mt-4 font-bold text-2xl">Password Reset!</h1>
					<p className="mt-2 text-muted-foreground">
						Your password has been successfully reset. You can now sign in with
						your new password.
					</p>
					<Link to="/login">
						<Button className="mt-6">Sign In</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<div className="mb-6 text-center">
				<KeyRound className="mx-auto h-12 w-12 text-muted-foreground" />
				<h1 className="mt-4 font-bold text-3xl">Reset Password</h1>
				<p className="mt-2 text-muted-foreground">
					Enter your new password below
				</p>
			</div>

			{error && (
				<div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
					<p className="text-red-600 text-sm dark:text-red-400">
						{error.message || "Failed to reset password. Please try again."}
					</p>
				</div>
			)}

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<div>
					<form.Field name="password">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>New Password</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									placeholder="Enter new password"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500 text-sm">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<div>
					<form.Field name="confirmPassword">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Confirm Password</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									placeholder="Confirm new password"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500 text-sm">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<form.Subscribe>
					{(state) => (
						<Button
							type="submit"
							className="w-full"
							disabled={!state.canSubmit || state.isSubmitting || isResetting}
						>
							{isResetting ? "Resetting..." : "Reset Password"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-4 text-center">
				<Link to="/login">
					<Button variant="link" className="text-muted-foreground">
						Back to Sign In
					</Button>
				</Link>
			</div>
		</div>
	);
}
