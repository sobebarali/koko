import { IconUpload, IconVideo } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { VideoListItem } from "@/hooks/use-videos";
import { VideoCard } from "./video-card";

interface VideoGridProps {
	videos: VideoListItem[];
	projectId: string;
	isLoading?: boolean;
	emptyMessage?: string;
	showUploadButton?: boolean;
	onEdit?: (video: VideoListItem) => void;
	onDelete?: (video: VideoListItem) => void;
	onUpload?: () => void;
}

function VideoSkeleton() {
	return (
		<Card className="overflow-hidden">
			<div className="aspect-video animate-pulse bg-muted" />
			<CardHeader className="space-y-2 p-3">
				<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
				<div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
			</CardHeader>
		</Card>
	);
}

export function VideoGrid({
	videos,
	projectId,
	isLoading,
	emptyMessage = "No videos yet",
	showUploadButton = true,
	onEdit,
	onDelete,
	onUpload,
}: VideoGridProps) {
	if (isLoading) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{[1, 2, 3, 4].map((i) => (
					<VideoSkeleton key={i} />
				))}
			</div>
		);
	}

	if (videos.length === 0) {
		return (
			<Card className="flex flex-col items-center justify-center py-12">
				<CardContent className="flex flex-col items-center text-center">
					<IconVideo className="mb-4 size-12 text-muted-foreground" />
					<p className="mb-2 font-medium text-muted-foreground">
						{emptyMessage}
					</p>
					<p className="mb-4 text-muted-foreground text-sm">
						Upload your first video to get started
					</p>
					{showUploadButton && onUpload && (
						<Button onClick={onUpload}>
							<IconUpload className="mr-2 size-4" />
							Upload Video
						</Button>
					)}
					{showUploadButton && !onUpload && (
						<Link to="/projects/$id/videos" params={{ id: projectId }}>
							<Button>
								<IconUpload className="mr-2 size-4" />
								Upload Video
							</Button>
						</Link>
					)}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{videos.map((video) => (
				<VideoCard
					key={video.id}
					video={video}
					projectId={projectId}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}
