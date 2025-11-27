import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { usePlaybackUrl } from "@/hooks/use-videos";
import { cn } from "@/lib/utils";

// Type declaration for player.js library loaded via CDN
declare global {
	interface Window {
		playerjs: {
			Player: new (element: HTMLIFrameElement) => PlayerJsInstance;
		};
	}
}

interface PlayerJsInstance {
	on: (
		event: string,
		callback: (data?: { seconds: number; duration: number }) => void,
	) => void;
	off: (event: string, callback?: () => void) => void;
	play: () => void;
	pause: () => void;
	setCurrentTime: (seconds: number) => void;
	getCurrentTime: (callback: (seconds: number) => void) => void;
	getDuration: (callback: (duration: number) => void) => void;
	supports: (type: "method" | "event", name: string) => boolean;
}

export interface VideoPlayerHandle {
	seekTo: (seconds: number) => void;
	getCurrentTime: () => Promise<number>;
}

interface VideoPlayerProps {
	videoId: string;
	title?: string;
	className?: string;
	autoplay?: boolean;
	muted?: boolean;
	onTimeUpdate?: (seconds: number) => void;
	thumbnailUrl?: string | null;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
	function VideoPlayer(
		{
			videoId,
			title,
			className,
			autoplay = false,
			muted = false,
			onTimeUpdate,
			thumbnailUrl,
		},
		ref,
	) {
		const [isIframeLoading, setIsIframeLoading] = useState(true);
		const { playbackUrl, isLoading, error } = usePlaybackUrl({ id: videoId });

		const iframeRef = useRef<HTMLIFrameElement>(null);
		const playerRef = useRef<PlayerJsInstance | null>(null);
		const onTimeUpdateRef = useRef(onTimeUpdate);

		// Keep the callback ref updated
		useEffect(() => {
			onTimeUpdateRef.current = onTimeUpdate;
		}, [onTimeUpdate]);

		// Initialize player.js when iframe loads
		const handleIframeLoad = useCallback(() => {
			setIsIframeLoading(false);

			if (!iframeRef.current || !window.playerjs) {
				return;
			}

			try {
				const player = new window.playerjs.Player(iframeRef.current);
				playerRef.current = player;

				player.on("ready", () => {
					// Listen for time updates
					player.on("timeupdate", (data) => {
						if (data && onTimeUpdateRef.current) {
							onTimeUpdateRef.current(Math.floor(data.seconds));
						}
					});
				});
			} catch (err) {
				console.error("Failed to initialize player.js:", err);
			}
		}, []);

		// Expose methods via ref
		useImperativeHandle(
			ref,
			() => ({
				seekTo: (seconds: number) => {
					if (playerRef.current) {
						playerRef.current.setCurrentTime(seconds);
					}
				},
				getCurrentTime: () => {
					return new Promise<number>((resolve) => {
						if (playerRef.current) {
							playerRef.current.getCurrentTime((time) => resolve(time));
						} else {
							resolve(0);
						}
					});
				},
			}),
			[],
		);

		if (isLoading) {
			return (
				<div
					className={cn(
						"relative aspect-video w-full overflow-hidden rounded-lg bg-black",
						className,
					)}
				>
					{thumbnailUrl && (
						<img
							src={thumbnailUrl}
							alt={title}
							className="absolute inset-0 size-full object-cover opacity-50"
						/>
					)}
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
				{isIframeLoading && thumbnailUrl && (
					<img
						src={thumbnailUrl}
						alt={title}
						className="absolute inset-0 size-full object-cover opacity-50"
					/>
				)}
				{isIframeLoading && (
					<div className="absolute inset-0 flex items-center justify-center">
						<IconLoader2 className="size-8 animate-spin text-white/50" />
					</div>
				)}
				<iframe
					ref={iframeRef}
					src={embedUrl.toString()}
					title={title || "Video Player"}
					loading="lazy"
					className="size-full"
					allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
					allowFullScreen
					onLoad={handleIframeLoad}
				/>
			</div>
		);
	},
);
