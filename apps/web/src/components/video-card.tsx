import {
	IconClock,
	IconDotsVertical,
	IconEdit,
	IconPlayerPlay,
	IconTrash,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VideoListItem, VideoStatus } from "@/hooks/use-videos";
import { cn } from "@/lib/utils";

interface VideoCardProps {
	video: VideoListItem;
	projectId: string;
	onEdit?: (video: VideoListItem) => void;
	onDelete?: (video: VideoListItem) => void;
	isSelected?: boolean;
	onToggleSelect?: (id: string) => void;
	selectionMode?: boolean;
}

function formatDuration(seconds: number | null): string {
	if (seconds === null) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getStatusVariant(
	status: VideoStatus,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "ready":
			return "default";
		case "processing":
		case "uploading":
			return "secondary";
		case "failed":
			return "destructive";
		default:
			return "outline";
	}
}

function getStatusLabel(status: VideoStatus): string {
	switch (status) {
		case "ready":
			return "Ready";
		case "processing":
			return "Processing";
		case "uploading":
			return "Uploading";
		case "failed":
			return "Failed";
		default:
			return status;
	}
}

export function VideoCard({
	video,
	projectId,
	onEdit,
	onDelete,
	isSelected,
	onToggleSelect,
	selectionMode,
}: VideoCardProps) {
	return (
		<Card className="group relative overflow-hidden">
			{onToggleSelect && (
				<div
					className={cn(
						"absolute top-2 right-2 z-20 transition-opacity duration-200",
						!selectionMode && !isSelected
							? "opacity-0 group-hover:opacity-100"
							: "opacity-100",
					)}
				>
					<Checkbox
						checked={isSelected}
						onCheckedChange={() => onToggleSelect(video.id)}
						className="size-5 border-2 bg-background/90 shadow-md backdrop-blur-sm data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
					/>
				</div>
			)}
			<Link
				to="/projects/$id/videos/$videoId"
				params={{ id: projectId, videoId: video.id }}
			>
				<div className="relative aspect-video bg-muted">
					{video.thumbnailUrl ? (
						<img
							src={video.thumbnailUrl}
							alt={video.title}
							className="size-full object-cover"
						/>
					) : (
						<div className="flex size-full items-center justify-center">
							<IconPlayerPlay className="size-12 text-muted-foreground" />
						</div>
					)}

					{video.status === "ready" && (
						<div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
							<div className="rounded-full bg-white/90 p-3">
								<IconPlayerPlay className="size-8 text-black" />
							</div>
						</div>
					)}

					{video.duration !== null && video.status === "ready" && (
						<div className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-white text-xs">
							<IconClock className="size-3" />
							{formatDuration(video.duration)}
						</div>
					)}

					{video.status !== "ready" && (
						<div className="absolute inset-0 flex items-center justify-center bg-black/50">
							<Badge variant={getStatusVariant(video.status)}>
								{getStatusLabel(video.status)}
							</Badge>
						</div>
					)}
				</div>
			</Link>

			<CardHeader className="p-3 pb-2">
				<div className="flex items-start justify-between gap-2">
					<Link
						to="/projects/$id/videos/$videoId"
						params={{ id: projectId, videoId: video.id }}
						className="flex-1 hover:underline"
					>
						<CardTitle className="line-clamp-2 text-sm">
							{video.title}
						</CardTitle>
					</Link>

					{(onEdit || onDelete) && (
						<DropdownMenu>
							<DropdownMenuTrigger className="shrink-0 rounded p-1 hover:bg-muted">
								<IconDotsVertical className="size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{onEdit && (
									<DropdownMenuItem onClick={() => onEdit(video)}>
										<IconEdit className="mr-2 size-4" />
										Edit
									</DropdownMenuItem>
								)}
								{onEdit && onDelete && <DropdownMenuSeparator />}
								{onDelete && (
									<DropdownMenuItem
										onClick={() => onDelete(video)}
										className="text-destructive focus:text-destructive"
									>
										<IconTrash className="mr-2 size-4" />
										Delete
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</CardHeader>

			<CardContent className="p-3 pt-0">
				<CardDescription className="flex items-center gap-2 text-xs">
					<span>{video.viewCount} views</span>
					<span>•</span>
					<span>
						{new Date(video.createdAt).toLocaleDateString(undefined, {
							month: "short",
							day: "numeric",
						})}
					</span>
				</CardDescription>
			</CardContent>
		</Card>
	);
}
