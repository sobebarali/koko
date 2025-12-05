import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { getAppUrl, isAppDomain } from "@/lib/domain";
import { AuthLayout } from "./auth-layout";
import Loader from "./loader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						toast.success("Sign in successful");
						// Redirect to app domain if not already on it
						if (isAppDomain()) {
							navigate({ to: "/dashboard" });
						} else {
							window.location.href = getAppUrl({ path: "/dashboard" });
						}
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<AuthLayout
			imageSrc="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&h=1600&fit=crop&q=80"
			imageAlt="Video editing workspace with professional monitors showing timeline"
			tagline="Collaborate on video projects with your team. Review, comment, and approve - all in one place."
		>
			{/* Logo for mobile */}
			<div className="mb-8 flex items-center gap-2 lg:hidden">
				<Video className="size-6 text-primary" />
				<span className="font-bold text-xl">Koko</span>
			</div>

			<h1 className="mb-2 font-bold text-3xl">Welcome Back</h1>
			<p className="mb-6 text-muted-foreground">
				Sign in to continue to your projects
			</p>

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
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<div>
					<form.Field name="password">
						{(field) => (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor={field.name}>Password</Label>
									<Link
										to="/auth/forgot-password"
										className="text-primary text-sm hover:text-primary/80"
									>
										Forgot password?
									</Link>
								</div>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500">
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
							disabled={!state.canSubmit || state.isSubmitting}
						>
							{state.isSubmitting ? "Submitting..." : "Sign In"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-4 text-center">
				<Button
					variant="link"
					onClick={onSwitchToSignUp}
					className="text-primary hover:text-primary/80"
				>
					Need an account? Sign Up
				</Button>
			</div>
		</AuthLayout>
	);
}
