import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { usePlaybackUrl } from "@/hooks/use-videos";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
	videoId: string;
	title?: string;
	className?: string;
	autoplay?: boolean;
	muted?: boolean;
}

export function VideoPlayer({
	videoId,
	title,
	className,
	autoplay = false,
	muted = false,
}: VideoPlayerProps) {
	const [isIframeLoading, setIsIframeLoading] = useState(true);
	const { playbackUrl, isLoading, error } = usePlaybackUrl({ id: videoId });

	if (isLoading) {
		return (
			<div
				className={cn(
					"relative aspect-video w-full overflow-hidden rounded-lg bg-black",
					className,
				)}
			>
				<div className="absolute inset-0 flex items-center justify-center">
					<IconLoader2 className="size-8 animate-spin text-white/50" />
				</div>
			</div>
		);
	}

	if (error || !playbackUrl) {
		return (
			<div
				className={cn(
					"relative aspect-video w-full overflow-hidden rounded-lg bg-muted",
					className,
				)}
			>
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
					<IconAlertCircle className="size-8" />
					<p className="text-sm">Video not available for playback</p>
				</div>
			</div>
		);
	}

	const embedUrl = new URL(playbackUrl);
	if (autoplay) embedUrl.searchParams.set("autoplay", "true");
	if (muted) embedUrl.searchParams.set("muted", "true");
	embedUrl.searchParams.set("preload", "true");

	return (
		<div
			className={cn(
				"relative aspect-video w-full overflow-hidden rounded-lg bg-black",
				className,
			)}
		>
			{isIframeLoading && (
				<div className="absolute inset-0 flex items-center justify-center">
					<IconLoader2 className="size-8 animate-spin text-white/50" />
				</div>
			)}
			<iframe
				src={embedUrl.toString()}
				title={title || "Video Player"}
				loading="lazy"
				className="size-full"
				allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
				allowFullScreen
				onLoad={() => setIsIframeLoading(false)}
			/>
		</div>
	);
}
