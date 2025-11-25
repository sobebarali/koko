import { useForm } from "@tanstack/react-form";
import z from "zod";
import { AvatarUpload } from "./avatar-upload";
import { Button } from "./ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";

interface ProfileFormProps {
	initialData: {
		name: string;
		email: string;
		image: string | null;
		bio: string | null;
		title: string | null;
		company: string | null;
		location: string | null;
		website: string | null;
	};
	onSubmit: (data: {
		name?: string;
		bio?: string;
		title?: string;
		company?: string;
		location?: string;
		website?: string;
	}) => Promise<void>;
	isSubmitting: boolean;
}

const profileSchema = z.object({
	name: z.string().min(1, "Name is required").max(100).trim(),
	bio: z.string().max(500, "Bio must be less than 500 characters"),
	title: z.string().max(100, "Title must be less than 100 characters"),
	company: z.string().max(100, "Company must be less than 100 characters"),
	location: z.string().max(100, "Location must be less than 100 characters"),
	website: z.string().url("Please enter a valid URL").or(z.literal("")),
});

export function ProfileForm({
	initialData,
	onSubmit,
	isSubmitting,
}: ProfileFormProps): React.ReactElement {
	const form = useForm({
		defaultValues: {
			name: initialData.name || "",
			bio: initialData.bio || "",
			title: initialData.title || "",
			company: initialData.company || "",
			location: initialData.location || "",
			website: initialData.website || "",
		},
		onSubmit: async ({ value }) => {
			// Filter out empty strings to only send changed fields
			const updates: Record<string, string> = {};
			if (value.name) updates.name = value.name;
			if (value.bio) updates.bio = value.bio;
			if (value.title) updates.title = value.title;
			if (value.company) updates.company = value.company;
			if (value.location) updates.location = value.location;
			if (value.website) updates.website = value.website;

			await onSubmit(updates);
		},
		validators: {
			onSubmit: profileSchema,
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Profile Settings</CardTitle>
				<CardDescription>
					Manage your profile information and public appearance
				</CardDescription>
			</CardHeader>

			<CardContent>
				<div className="space-y-6">
					{/* Avatar Section */}
					<div className="flex justify-center">
						<AvatarUpload
							currentImage={initialData.image}
							userName={initialData.name}
						/>
					</div>

					<Separator />

					{/* Profile Form */}
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-6"
					>
						{/* Personal Information */}
						<div className="space-y-4">
							<h3 className="font-medium text-sm">Personal Information</h3>

							<form.Field name="name">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Name</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Your name"
										/>
										{field.state.meta.errors.length > 0 && (
											<p className="text-red-500 text-sm">
												{String(field.state.meta.errors[0])}
											</p>
										)}
									</div>
								)}
							</form.Field>

							<div className="space-y-2">
								<Label>Email</Label>
								<Input value={initialData.email} disabled />
								<p className="text-muted-foreground text-xs">
									Email cannot be changed
								</p>
							</div>

							<form.Field name="bio">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Bio</Label>
										<Textarea
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Tell us about yourself"
											rows={3}
										/>
										<p className="text-muted-foreground text-xs">
											{field.state.value?.length || 0}/500 characters
										</p>
										{field.state.meta.errors.length > 0 && (
											<p className="text-red-500 text-sm">
												{String(field.state.meta.errors[0])}
											</p>
										)}
									</div>
								)}
							</form.Field>
						</div>

						<Separator />

						{/* Professional Information */}
						<div className="space-y-4">
							<h3 className="font-medium text-sm">Professional Information</h3>

							<div className="grid gap-4 sm:grid-cols-2">
								<form.Field name="title">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Job Title</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="e.g. Software Engineer"
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-red-500 text-sm">
													{String(field.state.meta.errors[0])}
												</p>
											)}
										</div>
									)}
								</form.Field>

								<form.Field name="company">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Company</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="e.g. Acme Inc."
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-red-500 text-sm">
													{String(field.state.meta.errors[0])}
												</p>
											)}
										</div>
									)}
								</form.Field>
							</div>
						</div>

						<Separator />

						{/* Contact Information */}
						<div className="space-y-4">
							<h3 className="font-medium text-sm">Contact Information</h3>

							<div className="grid gap-4 sm:grid-cols-2">
								<form.Field name="location">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Location</Label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="e.g. San Francisco, CA"
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-red-500 text-sm">
													{String(field.state.meta.errors[0])}
												</p>
											)}
										</div>
									)}
								</form.Field>

								<form.Field name="website">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Website</Label>
											<Input
												id={field.name}
												name={field.name}
												type="url"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="https://example.com"
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-red-500 text-sm">
													{String(field.state.meta.errors[0])}
												</p>
											)}
										</div>
									)}
								</form.Field>
							</div>
						</div>

						<CardFooter className="px-0">
							<form.Subscribe>
								{(state) => (
									<Button
										type="submit"
										disabled={
											!state.canSubmit || state.isSubmitting || isSubmitting
										}
									>
										{state.isSubmitting || isSubmitting
											? "Saving..."
											: "Save Changes"}
									</Button>
								)}
							</form.Subscribe>
						</CardFooter>
					</form>
				</div>
			</CardContent>
		</Card>
	);
}
