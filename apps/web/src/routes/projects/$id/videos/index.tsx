import {
	IconArrowLeft,
	IconLoader2,
	IconSearch,
	IconUpload,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoGrid } from "@/components/video-grid";
import { VideoUpload } from "@/components/video-upload";
import { useProject } from "@/hooks/use-projects";
import {
	useDeleteVideo,
	useVideos,
	type VideoStatus,
} from "@/hooks/use-videos";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/projects/$id/videos/")({
	component: ProjectVideosPage,
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

function ProjectVideosPage() {
	const { session } = Route.useRouteContext();
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<VideoStatus | "all">("all");
	const [isUploadOpen, setIsUploadOpen] = useState(false);

	const { project, isLoading: isLoadingProject } = useProject({ id });
	const { videos, isLoading: isLoadingVideos } = useVideos({
		projectId: id,
		status: statusFilter === "all" ? undefined : statusFilter,
		limit: 50,
	});
	const { deleteVideo } = useDeleteVideo();

	const userData = {
		name: session.data?.user.name || "User",
		email: session.data?.user.email || "user@example.com",
		avatar:
			session.data?.user.image ||
			`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.data?.user.name || "User"}`,
	};

	const filteredVideos = videos.filter((video) =>
		video.title.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<SidebarProvider>
			<AppSidebar user={userData} projectId={id} />
			<SidebarInset>
				<div className="@container/main flex min-h-screen flex-col">
					<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
						<div className="flex h-16 items-center gap-2 px-4 lg:px-6">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="mr-2 h-4" />

							<Link to="/projects/$id" params={{ id }}>
								<Button variant="ghost" size="sm">
									<IconArrowLeft className="mr-2 size-4" />
									Back to Project
								</Button>
							</Link>

							<div className="flex-1" />

							<Button onClick={() => setIsUploadOpen(true)}>
								<IconUpload className="mr-2 size-4" />
								Upload Video
							</Button>
						</div>
					</header>

					<div className="flex-1 p-4 pb-8 lg:p-6">
						{isLoadingProject ? (
							<div className="flex items-center justify-center py-16">
								<IconLoader2 className="size-8 animate-spin text-muted-foreground" />
							</div>
						) : (
							<div className="space-y-6">
								<div>
									<h1 className="font-bold text-2xl tracking-tight lg:text-3xl">
										{project?.name} - Videos
									</h1>
									<p className="mt-1 text-muted-foreground">
										Manage and upload videos for this project
									</p>
								</div>

								<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="relative max-w-sm flex-1">
										<IconSearch className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
										<Input
											placeholder="Search videos..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="pl-9"
										/>
									</div>

									<Tabs
										value={statusFilter}
										onValueChange={(v) =>
											setStatusFilter(v as VideoStatus | "all")
										}
									>
										<TabsList>
											<TabsTrigger value="all">All</TabsTrigger>
											<TabsTrigger value="ready">Ready</TabsTrigger>
											<TabsTrigger value="processing">Processing</TabsTrigger>
											<TabsTrigger value="uploading">Uploading</TabsTrigger>
											<TabsTrigger value="failed">Failed</TabsTrigger>
										</TabsList>
									</Tabs>
								</div>

								<VideoGrid
									videos={filteredVideos}
									projectId={id}
									isLoading={isLoadingVideos}
									emptyMessage={
										searchQuery
											? "No videos match your search"
											: "No videos yet"
									}
									showUploadButton={!searchQuery}
									onDelete={(video) => deleteVideo(video.id)}
									onUploadClick={() => setIsUploadOpen(true)}
								/>
							</div>
						)}
					</div>
				</div>
			</SidebarInset>

			{isUploadOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<Card className="w-full max-w-lg">
						<CardHeader>
							<CardTitle>Upload Video</CardTitle>
							<CardDescription>Upload a video to this project</CardDescription>
						</CardHeader>
						<CardContent>
							<VideoUpload
								projectId={id}
								onSuccess={(videoId) => {
									setIsUploadOpen(false);
									queryClient.invalidateQueries({
										queryKey: [["video", "getAll"]],
									});
									navigate({
										to: "/projects/$id/videos/$videoId",
										params: { id, videoId },
									});
								}}
								onCancel={() => setIsUploadOpen(false)}
							/>
						</CardContent>
					</Card>
				</div>
			)}
		</SidebarProvider>
	);
}
