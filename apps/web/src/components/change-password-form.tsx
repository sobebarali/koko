import { useForm } from "@tanstack/react-form";
import { KeyRound } from "lucide-react";
import z from "zod";
import { useChangePassword } from "@/hooks/use-auth";
import { Button } from "./ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function ChangePasswordForm(): React.ReactElement {
	const { changePassword, isChanging } = useChangePassword();

	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
			revokeOtherSessions: true,
		},
		onSubmit: async ({ value }) => {
			await changePassword(
				value.currentPassword,
				value.newPassword,
				value.revokeOtherSessions,
			);
			// Reset form on success
			form.reset();
		},
		validators: {
			onSubmit: z
				.object({
					currentPassword: z.string().min(1, "Current password is required"),
					newPassword: z
						.string()
						.min(8, "Password must be at least 8 characters")
						.max(72, "Password must be at most 72 characters"),
					confirmPassword: z.string(),
					revokeOtherSessions: z.boolean(),
				})
				.refine((data) => data.newPassword === data.confirmPassword, {
					message: "Passwords do not match",
					path: ["confirmPassword"],
				}),
		},
	});

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<KeyRound className="h-5 w-5 text-muted-foreground" />
					<CardTitle>Change Password</CardTitle>
				</div>
				<CardDescription>
					Update your password to keep your account secure
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<div>
						<form.Field name="currentPassword">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Current Password</Label>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										placeholder="Enter current password"
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
						<form.Field name="newPassword">
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
									<Label htmlFor={field.name}>Confirm New Password</Label>
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

					<div>
						<form.Field name="revokeOtherSessions">
							{(field) => (
								<div className="flex items-center space-x-2">
									<Checkbox
										id={field.name}
										checked={field.state.value}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
									/>
									<Label
										htmlFor={field.name}
										className="font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										Sign out from all other devices
									</Label>
								</div>
							)}
						</form.Field>
					</div>

					<form.Subscribe>
						{(state) => (
							<Button
								type="submit"
								disabled={!state.canSubmit || state.isSubmitting || isChanging}
							>
								{isChanging ? "Changing..." : "Change Password"}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
