import {
	IconArchive,
	IconArrowLeft,
	IconEdit,
	IconLoader2,
	IconSettings,
	IconTrash,
	IconUpload,
	IconUsers,
} from "@tabler/icons-react";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { VideoCard } from "@/components/video-card";
import {
	useArchiveProject,
	useDeleteProject,
	useProject,
} from "@/hooks/use-projects";
import { useDeleteVideo, useVideos } from "@/hooks/use-videos";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/projects/$id")({
	component: ProjectDetailPage,
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

function ProjectDetailPage() {
	const { session } = Route.useRouteContext();
	const { id } = Route.useParams();
	const navigate = useNavigate();

	const { project, isLoading, error } = useProject({ id });
	const { archiveProject, unarchiveProject, isArchiving } = useArchiveProject();
	const { deleteProject, isDeleting } = useDeleteProject();
	const { videos, isLoading: isLoadingVideos } = useVideos({
		projectId: id,
		limit: 4,
	});
	const { deleteVideo } = useDeleteVideo();

	const userData = {
		name: session.data?.user.name || "User",
		email: session.data?.user.email || "user@example.com",
		avatar:
			session.data?.user.image ||
			`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.data?.user.name || "User"}`,
	};

	const handleDelete = async () => {
		await deleteProject(id);
		navigate({ to: "/projects" });
	};

	const handleArchive = async () => {
		if (project?.status === "archived") {
			await unarchiveProject(id);
		} else {
			await archiveProject(id);
		}
	};

	const isOwner = project?.ownerId === session.data?.user.id;

	return (
		<SidebarProvider>
			<AppSidebar user={userData} />
			<SidebarInset>
				<div className="@container/main flex min-h-screen flex-col">
					<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
						<div className="flex h-16 items-center gap-2 px-4 lg:px-6">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="mr-2 h-4" />

							<Link to="/projects">
								<Button variant="ghost" size="sm">
									<IconArrowLeft className="mr-2 size-4" />
									Back to Projects
								</Button>
							</Link>

							<div className="flex-1" />

							{isOwner && project && (
								<div className="flex items-center gap-2">
									<Link to="/projects/$id/edit" params={{ id }}>
										<Button variant="outline" size="sm">
											<IconEdit className="mr-2 size-4" />
											Edit
										</Button>
									</Link>

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="outline" size="sm">
												<IconSettings className="mr-2 size-4" />
												Actions
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onClick={handleArchive}
												disabled={isArchiving}
											>
												<IconArchive className="mr-2 size-4" />
												{project.status === "archived"
													? "Unarchive"
													: "Archive"}
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={handleDelete}
												disabled={isDeleting}
												className="text-destructive focus:text-destructive"
											>
												<IconTrash className="mr-2 size-4" />
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							)}
						</div>
					</header>

					<div className="flex-1 p-4 pb-8 lg:p-6">
						{isLoading ? (
							<div className="flex items-center justify-center py-16">
								<IconLoader2 className="size-8 animate-spin text-muted-foreground" />
							</div>
						) : error ? (
							<Card className="flex flex-col items-center justify-center py-16">
								<CardTitle className="mb-2 text-destructive">
									Error loading project
								</CardTitle>
								<CardDescription>
									{(error as Error)?.message || "Something went wrong"}
								</CardDescription>
								<Link to="/projects" className="mt-4">
									<Button variant="outline">Back to Projects</Button>
								</Link>
							</Card>
						) : project ? (
							<div className="space-y-6">
								<div className="flex items-start gap-4">
									{project.color && (
										<div
											className="mt-1 size-10 rounded-lg"
											style={{ backgroundColor: project.color }}
										/>
									)}
									<div className="flex-1">
										<div className="flex items-center gap-3">
											<h1 className="font-bold text-2xl tracking-tight lg:text-3xl">
												{project.name}
											</h1>
											<Badge
												variant={
													project.status === "active" ? "default" : "secondary"
												}
											>
												{project.status}
											</Badge>
										</div>
										{project.description && (
											<p className="mt-2 text-muted-foreground">
												{project.description}
											</p>
										)}
									</div>
								</div>

								<div className="grid gap-4 md:grid-cols-3">
									<Card>
										<CardHeader className="pb-2">
											<CardTitle className="font-medium text-muted-foreground text-sm">
												Videos
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="font-bold text-2xl">
												{project.videoCount}
											</div>
										</CardContent>
									</Card>
									<Card>
										<CardHeader className="pb-2">
											<CardTitle className="font-medium text-muted-foreground text-sm">
												Members
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="flex items-center gap-2">
												<IconUsers className="size-5 text-muted-foreground" />
												<span className="font-bold text-2xl">
													{project.memberCount}
												</span>
											</div>
										</CardContent>
									</Card>
									<Card>
										<CardHeader className="pb-2">
											<CardTitle className="font-medium text-muted-foreground text-sm">
												Comments
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="font-bold text-2xl">
												{project.commentCount}
											</div>
										</CardContent>
									</Card>
								</div>

								<Card>
									<CardHeader>
										<CardTitle>Owner</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="flex items-center gap-3">
											<img
												src={
													project.owner.image ||
													`https://api.dicebear.com/7.x/avataaars/svg?seed=${project.owner.name}`
												}
												alt={project.owner.name}
												className="size-10 rounded-full"
											/>
											<div>
												<p className="font-medium">{project.owner.name}</p>
												<p className="text-muted-foreground text-sm">Owner</p>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<div className="flex items-center justify-between">
											<CardTitle>Videos</CardTitle>
											<div className="flex items-center gap-2">
												{videos.length > 0 && (
													<Link to="/projects/$id/videos" params={{ id }}>
														<Button variant="outline" size="sm">
															View All
														</Button>
													</Link>
												)}
												<Link to="/projects/$id/videos" params={{ id }}>
													<Button size="sm">
														<IconUpload className="mr-2 size-4" />
														Upload Video
													</Button>
												</Link>
											</div>
										</div>
									</CardHeader>
									<CardContent>
										{isLoadingVideos ? (
											<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
												{[1, 2, 3, 4].map((i) => (
													<Card key={i} className="overflow-hidden">
														<div className="aspect-video animate-pulse bg-muted" />
														<CardHeader className="space-y-2 p-3">
															<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
															<div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
														</CardHeader>
													</Card>
												))}
											</div>
										) : videos.length === 0 ? (
											<div className="flex flex-col items-center justify-center py-8 text-center">
												<p className="mb-2 text-muted-foreground">
													No videos yet
												</p>
												<p className="text-muted-foreground text-sm">
													Upload your first video to get started
												</p>
											</div>
										) : (
											<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
												{videos.map((video) => (
													<VideoCard
														key={video.id}
														video={video}
														projectId={id}
														onDelete={(v) => deleteVideo(v.id)}
													/>
												))}
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						) : null}
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
