import type React from "react";
import { useProcessingStatus, type VideoListItem } from "@/hooks/use-videos";
import { VideoCard } from "./video-card";

interface VideoCardWithProgressProps {
	video: VideoListItem;
	projectId: string;
	onEdit?: (video: VideoListItem) => void;
	onDelete?: (video: VideoListItem) => void;
	isSelected?: boolean;
	onToggleSelect?: (id: string) => void;
	selectionMode?: boolean;
}

export function VideoCardWithProgress({
	video,
	projectId,
	onEdit,
	onDelete,
	isSelected,
	onToggleSelect,
	selectionMode,
}: VideoCardWithProgressProps): React.ReactNode {
	// Only poll for progress if video is processing or uploading
	const shouldPoll =
		video.status === "processing" || video.status === "uploading";

	const { progress } = useProcessingStatus({
		id: video.id,
		enabled: shouldPoll,
	});

	return (
		<VideoCard
			video={video}
			projectId={projectId}
			progress={shouldPoll ? progress : undefined}
			onEdit={onEdit}
			onDelete={onDelete}
			isSelected={isSelected}
			onToggleSelect={onToggleSelect}
			selectionMode={selectionMode}
		/>
	);
}
