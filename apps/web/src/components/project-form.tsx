"use client";

import { useForm } from "@tanstack/react-form";
import z from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const projectSchema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	description: z.string().max(2000),
	color: z.string(),
});

interface ProjectFormProps {
	defaultValues?: {
		name?: string;
		description?: string;
		color?: string;
	};
	onSubmit: (values: {
		name: string;
		description?: string;
		color?: string;
	}) => Promise<void>;
	isSubmitting?: boolean;
	submitLabel?: string;
}

const colorOptions = [
	{ value: "#ef4444", label: "Red" },
	{ value: "#f97316", label: "Orange" },
	{ value: "#eab308", label: "Yellow" },
	{ value: "#22c55e", label: "Green" },
	{ value: "#3b82f6", label: "Blue" },
	{ value: "#8b5cf6", label: "Purple" },
	{ value: "#ec4899", label: "Pink" },
	{ value: "#6b7280", label: "Gray" },
];

export function ProjectForm({
	defaultValues,
	onSubmit,
	isSubmitting = false,
	submitLabel = "Create Project",
}: ProjectFormProps): React.ReactElement {
	const form = useForm({
		defaultValues: {
			name: defaultValues?.name ?? "",
			description: defaultValues?.description ?? "",
			color: defaultValues?.color ?? "",
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				name: value.name,
				description: value.description || undefined,
				color: value.color || undefined,
			});
		},
		validators: {
			onSubmit: projectSchema,
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			<form.Field name="name">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>
							Project Name <span className="text-destructive">*</span>
						</Label>
						<Input
							id={field.name}
							name={field.name}
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
							placeholder="Enter project name"
						/>
						{field.state.meta.errors.length > 0 && (
							<p className="text-destructive text-sm">
								{String(field.state.meta.errors[0])}
							</p>
						)}
					</div>
				)}
			</form.Field>

			<form.Field name="description">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Description</Label>
						<Textarea
							id={field.name}
							name={field.name}
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
							placeholder="Enter project description (optional)"
							rows={4}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className="text-destructive text-sm">
								{String(field.state.meta.errors[0])}
							</p>
						)}
					</div>
				)}
			</form.Field>

			<form.Field name="color">
				{(field) => (
					<div className="space-y-2">
						<Label>Project Color</Label>
						<div className="flex flex-wrap gap-2">
							{colorOptions.map((color) => (
								<button
									key={color.value}
									type="button"
									onClick={() => field.handleChange(color.value)}
									className={`size-8 rounded-full border-2 transition-all ${
										field.state.value === color.value
											? "scale-110 border-foreground"
											: "border-transparent hover:scale-105"
									}`}
									style={{ backgroundColor: color.value }}
									title={color.label}
								/>
							))}
							{field.state.value && (
								<button
									type="button"
									onClick={() => field.handleChange("")}
									className="text-muted-foreground text-sm hover:text-foreground"
								>
									Clear
								</button>
							)}
						</div>
					</div>
				)}
			</form.Field>

			<form.Subscribe>
				{(state) => (
					<Button
						type="submit"
						disabled={!state.canSubmit || state.isSubmitting || isSubmitting}
						className="w-full"
					>
						{state.isSubmitting || isSubmitting ? "Saving..." : submitLabel}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
