import {
	IconArrowLeft,
	IconCalendar,
	IconClock,
	IconDownload,
	IconEdit,
	IconEye,
	IconFile,
	IconLoader2,
	IconMessageCircle,
	IconTrash,
} from "@tabler/icons-react";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CommentList } from "@/components/comment-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { VideoEditForm } from "@/components/video-edit-form";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player";
import { useProject } from "@/hooks/use-projects";
import {
	useDeleteVideo,
	useDownloadOriginal,
	useProcessingStatus,
	useVideo,
} from "@/hooks/use-videos";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/projects/$id/videos/$videoId")({
	component: VideoDetailPage,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				throw: true,
			});
		}
		return { session };
	},
});

function formatDuration(seconds: number | null): string {
	if (seconds === null) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getStatusVariant(
	status: string,
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

function VideoDetailPage() {
	const { session } = Route.useRouteContext();
	const { id, videoId } = Route.useParams();
	const navigate = useNavigate();
	const [isEditing, setIsEditing] = useState(false);
	const [showComments, setShowComments] = useState(true);
	const [currentTimecode, setCurrentTimecode] = useState(0);

	const videoPlayerRef = useRef<VideoPlayerHandle>(null);

	const { project } = useProject({ id });
	const { video, isLoading, error } = useVideo({ id: videoId });
	const { deleteVideo, isDeleting } = useDeleteVideo();
	const { getDownloadUrl, isLoading: isDownloading } = useDownloadOriginal();

	const { status: processingStatus, progress: processingProgress } =
		useProcessingStatus({
			id: videoId,
			enabled: video?.status === "processing" || video?.status === "uploading",
		});

	const currentUserId = session.data?.user.id || "";

	const handleTimeUpdate = useCallback((seconds: number) => {
		setCurrentTimecode(seconds);
	}, []);

	const handleTimecodeClick = useCallback((timecode: number) => {
		videoPlayerRef.current?.seekTo(timecode);
	}, []);

	const userData = {
		name: session.data?.user.name || "User",
		email: session.data?.user.email || "user@example.com",
		avatar:
			session.data?.user.image ||
			`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.data?.user.name || "User"}`,
	};

	const handleDelete = async () => {
		if (confirm("Are you sure you want to delete this video?")) {
			await deleteVideo(videoId);
			navigate({
				to: "/projects/$id/videos",
				params: { id },
			});
		}
	};

	const handleDownload = async () => {
		try {
			const url = await getDownloadUrl(videoId);
			window.open(url, "_blank");
		} catch (error) {
			// Error handled in hook
		}
	};

	const isOwner = project?.ownerId === session.data?.user.id;

	return (
		<SidebarProvider>
			<AppSidebar user={userData} projectId={id} />
			<SidebarInset>
				<div className="@container/main flex min-h-screen flex-col">
					<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
						<div className="flex h-16 items-center gap-2 px-4 lg:px-6">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="mr-2 h-4" />

							<Link to="/projects/$id/videos" params={{ id }}>
								<Button variant="ghost" size="sm">
									<IconArrowLeft className="mr-2 size-4" />
									Back to Videos
								</Button>
							</Link>

							<div className="flex-1" />

							{isOwner && video && (
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={handleDownload}
										disabled={isDownloading}
									>
										{isDownloading ? (
											<IconLoader2 className="mr-2 size-4 animate-spin" />
										) : (
											<IconDownload className="mr-2 size-4" />
										)}
										Download
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setIsEditing(true)}
									>
										<IconEdit className="mr-2 size-4" />
										Edit
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={handleDelete}
										disabled={isDeleting}
										className="text-destructive hover:text-destructive"
									>
										<IconTrash className="mr-2 size-4" />
										Delete
									</Button>
								</div>
							)}

							<Button
								variant={showComments ? "default" : "outline"}
								size="sm"
								onClick={() => setShowComments(!showComments)}
							>
								<IconMessageCircle className="mr-2 size-4" />
								Comments
							</Button>
						</div>
					</header>

					<div className="flex flex-1 overflow-hidden">
						<div className="flex-1 overflow-auto p-4 pb-8 lg:p-6">
							{isLoading ? (
								<div className="flex items-center justify-center py-16">
									<IconLoader2 className="size-8 animate-spin text-muted-foreground" />
								</div>
							) : error ? (
								<Card className="flex flex-col items-center justify-center py-16">
									<CardTitle className="mb-2 text-destructive">
										Error loading video
									</CardTitle>
									<CardDescription>
										{(error as Error)?.message || "Something went wrong"}
									</CardDescription>
									<Link
										to="/projects/$id/videos"
										params={{ id }}
										className="mt-4"
									>
										<Button variant="outline">Back to Videos</Button>
									</Link>
								</Card>
							) : video ? (
								<div className="mx-auto max-w-5xl space-y-6">
									{video.status === "ready" ? (
										<VideoPlayer
											ref={videoPlayerRef}
											videoId={video.id}
											title={video.title}
											onTimeUpdate={handleTimeUpdate}
										/>
									) : (
										<div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
											<div className="text-center">
												<Badge
													variant={getStatusVariant(
														processingStatus || video.status,
													)}
												>
													{processingStatus || video.status}
												</Badge>
												<p className="mt-2 text-muted-foreground text-sm">
													{(processingStatus || video.status) ===
														"processing" &&
														`Processing: ${processingProgress ?? video.processingProgress ?? 0}%`}
													{(processingStatus || video.status) === "uploading" &&
														"Upload in progress..."}
													{(processingStatus || video.status) === "failed" &&
														(video.errorMessage || "Processing failed")}
												</p>
											</div>
										</div>
									)}

									<div className="space-y-4">
										<div className="flex items-start justify-between gap-4">
											<div>
												<h1 className="font-bold text-2xl tracking-tight">
													{video.title}
												</h1>
												{video.description && (
													<p className="mt-2 text-muted-foreground">
														{video.description}
													</p>
												)}
											</div>
										</div>

										{video.tags && video.tags.length > 0 && (
											<div className="flex flex-wrap gap-2">
												{video.tags.map((tag) => (
													<Badge key={tag} variant="secondary">
														{tag}
													</Badge>
												))}
											</div>
										)}

										<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
											<Card>
												<CardContent className="flex items-center gap-3 p-4">
													<IconEye className="size-5 text-muted-foreground" />
													<div>
														<p className="font-medium text-sm">Views</p>
														<p className="text-muted-foreground text-xl">
															{video.viewCount}
														</p>
													</div>
												</CardContent>
											</Card>

											{video.duration !== null && (
												<Card>
													<CardContent className="flex items-center gap-3 p-4">
														<IconClock className="size-5 text-muted-foreground" />
														<div>
															<p className="font-medium text-sm">Duration</p>
															<p className="text-muted-foreground text-xl">
																{formatDuration(video.duration)}
															</p>
														</div>
													</CardContent>
												</Card>
											)}

											<Card>
												<CardContent className="flex items-center gap-3 p-4">
													<IconFile className="size-5 text-muted-foreground" />
													<div>
														<p className="font-medium text-sm">Size</p>
														<p className="text-muted-foreground text-xl">
															{formatFileSize(video.fileSize)}
														</p>
													</div>
												</CardContent>
											</Card>

											<Card>
												<CardContent className="flex items-center gap-3 p-4">
													<IconCalendar className="size-5 text-muted-foreground" />
													<div>
														<p className="font-medium text-sm">Uploaded</p>
														<p className="text-muted-foreground text-xl">
															{new Date(video.createdAt).toLocaleDateString()}
														</p>
													</div>
												</CardContent>
											</Card>
										</div>

										{(video.width || video.height || video.fps) && (
											<Card>
												<CardHeader>
													<CardTitle className="text-base">
														Technical Details
													</CardTitle>
												</CardHeader>
												<CardContent className="grid gap-2 text-sm">
													{video.width && video.height && (
														<div className="flex justify-between">
															<span className="text-muted-foreground">
																Resolution
															</span>
															<span>
																{video.width} x {video.height}
															</span>
														</div>
													)}
													{video.fps && (
														<div className="flex justify-between">
															<span className="text-muted-foreground">
																Frame Rate
															</span>
															<span>{video.fps} fps</span>
														</div>
													)}
													<div className="flex justify-between">
														<span className="text-muted-foreground">
															Original File
														</span>
														<span>{video.originalFileName}</span>
													</div>
													<div className="flex justify-between">
														<span className="text-muted-foreground">Type</span>
														<span>{video.mimeType}</span>
													</div>
												</CardContent>
											</Card>
										)}
									</div>
								</div>
							) : null}
						</div>

						{showComments && video && (
							<div className="hidden w-96 shrink-0 border-l bg-background lg:block">
								<CommentList
									videoId={videoId}
									currentUserId={currentUserId}
									currentTimecode={currentTimecode}
									onTimecodeClick={handleTimecodeClick}
								/>
							</div>
						)}
					</div>
				</div>

				{isEditing && video && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
						<Card className="w-full max-w-lg">
							<CardHeader>
								<CardTitle>Edit Video</CardTitle>
							</CardHeader>
							<CardContent>
								<VideoEditForm
									video={video}
									onSuccess={() => setIsEditing(false)}
									onCancel={() => setIsEditing(false)}
								/>
							</CardContent>
						</Card>
					</div>
				)}
			</SidebarInset>
		</SidebarProvider>
	);
}
