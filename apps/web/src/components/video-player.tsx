import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
	libraryId: string;
	videoId: string;
	title?: string;
	className?: string;
	autoplay?: boolean;
	muted?: boolean;
}

export function VideoPlayer({
	libraryId,
	videoId,
	title,
	className,
	autoplay = false,
	muted = false,
}: VideoPlayerProps) {
	const [isLoading, setIsLoading] = useState(true);

	const embedUrl = new URL(
		`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`,
	);

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
			{isLoading && (
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
				onLoad={() => setIsLoading(false)}
			/>
		</div>
	);
}
