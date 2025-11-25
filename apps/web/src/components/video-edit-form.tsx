import { IconLoader2, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateVideo, type VideoDetail } from "@/hooks/use-videos";

interface VideoEditFormProps {
	video: VideoDetail;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function VideoEditForm({
	video,
	onSuccess,
	onCancel,
}: VideoEditFormProps) {
	const [title, setTitle] = useState(video.title);
	const [description, setDescription] = useState(video.description || "");
	const [tagInput, setTagInput] = useState("");
	const [tags, setTags] = useState<string[]>(video.tags || []);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const { updateVideo, isUpdating } = useUpdateVideo();

	const handleAddTag = () => {
		const trimmedTag = tagInput.trim();
		if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
			setTags([...tags, trimmedTag]);
			setTagInput("");
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		setTags(tags.filter((tag) => tag !== tagToRemove));
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAddTag();
		}
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!title.trim()) {
			newErrors.title = "Title is required";
		} else if (title.length > 200) {
			newErrors.title = "Title must be less than 200 characters";
		}

		if (description.length > 2000) {
			newErrors.description = "Description must be less than 2000 characters";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) return;

		await updateVideo({
			id: video.id,
			title: title.trim(),
			description: description.trim() || undefined,
			tags: tags.length > 0 ? tags : undefined,
		});

		onSuccess?.();
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="title">
					Title <span className="text-destructive">*</span>
				</Label>
				<Input
					id="title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="Video title"
					maxLength={200}
				/>
				{errors.title && (
					<p className="text-destructive text-sm">{errors.title}</p>
				)}
				<p className="text-muted-foreground text-xs">
					{title.length}/200 characters
				</p>
			</div>

			<div className="space-y-2">
				<Label htmlFor="description">Description</Label>
				<Textarea
					id="description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Video description (optional)"
					rows={4}
					maxLength={2000}
				/>
				{errors.description && (
					<p className="text-destructive text-sm">{errors.description}</p>
				)}
				<p className="text-muted-foreground text-xs">
					{description.length}/2000 characters
				</p>
			</div>

			<div className="space-y-2">
				<Label htmlFor="tags">Tags</Label>
				<div className="flex gap-2">
					<Input
						id="tags"
						value={tagInput}
						onChange={(e) => setTagInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Add a tag and press Enter"
						maxLength={50}
						disabled={tags.length >= 10}
					/>
					<Button
						type="button"
						variant="outline"
						onClick={handleAddTag}
						disabled={!tagInput.trim() || tags.length >= 10}
					>
						Add
					</Button>
				</div>
				{tags.length > 0 && (
					<div className="flex flex-wrap gap-2 pt-2">
						{tags.map((tag) => (
							<Badge key={tag} variant="secondary" className="gap-1 pr-1">
								{tag}
								<button
									type="button"
									onClick={() => handleRemoveTag(tag)}
									className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
								>
									<IconX className="size-3" />
								</button>
							</Badge>
						))}
					</div>
				)}
				<p className="text-muted-foreground text-xs">{tags.length}/10 tags</p>
			</div>

			<div className="flex justify-end gap-2 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={isUpdating}>
					{isUpdating && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save Changes
				</Button>
			</div>
		</form>
	);
}
