import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle, Mail } from "lucide-react";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestPasswordReset } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/forgot-password")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const { requestReset, isRequesting, isSuccess } = useRequestPasswordReset();

	const form = useForm({
		defaultValues: {
			email: "",
		},
		onSubmit: async ({ value }) => {
			await requestReset(value.email);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
			}),
		},
	});

	if (isSuccess) {
		return (
			<div className="mx-auto mt-10 w-full max-w-md p-6">
				<div className="text-center">
					<CheckCircle className="mx-auto h-16 w-16 text-green-500" />
					<h1 className="mt-4 font-bold text-2xl">Check Your Email</h1>
					<p className="mt-2 text-muted-foreground">
						If an account exists with that email, we've sent a password reset
						link. Please check your inbox and spam folder.
					</p>
					<p className="mt-4 text-muted-foreground text-sm">
						The link will expire in 1 hour.
					</p>
					<Link to="/login">
						<Button variant="link" className="mt-6">
							Back to Sign In
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<div className="mb-6 text-center">
				<Mail className="mx-auto h-12 w-12 text-muted-foreground" />
				<h1 className="mt-4 font-bold text-3xl">Forgot Password?</h1>
				<p className="mt-2 text-muted-foreground">
					Enter your email and we'll send you a reset link
				</p>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<div>
					<form.Field name="email">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Email</Label>
								<Input
									id={field.name}
									name={field.name}
									type="email"
									placeholder="you@example.com"
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
							disabled={!state.canSubmit || state.isSubmitting || isRequesting}
						>
							{isRequesting ? "Sending..." : "Send Reset Link"}
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
