import {
	IconArchive,
	IconCopy,
	IconDots,
	IconFolder,
	IconPlus,
	IconSearch,
	IconTrash,
	IconUsers,
} from "@tabler/icons-react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import * as React from "react";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type Project,
	useArchiveProject,
	useDeleteProject,
	useDuplicateProject,
	useProjects,
} from "@/hooks/use-projects";
import { authClient } from "@/lib/auth-client";
import { getAppUrl, isLandingDomain } from "@/lib/domain";

export const Route = createFileRoute("/projects/")({
	component: ProjectsPage,
	beforeLoad: async () => {
		// Redirect to app domain if on landing domain
		if (isLandingDomain()) {
			window.location.href = getAppUrl({ path: "/projects" });
			throw new Error("Redirecting to app domain");
		}

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

function ProjectsPage() {
	const { session } = Route.useRouteContext();
	const [searchQuery, setSearchQuery] = React.useState("");
	const [activeTab, setActiveTab] = React.useState<"active" | "archived">(
		"active",
	);

	const { projects, isLoading } = useProjects({ status: activeTab });
	const { archiveProject, unarchiveProject } = useArchiveProject();
	const { deleteProject } = useDeleteProject();
	const { duplicateProject } = useDuplicateProject();

	const filteredProjects = React.useMemo(() => {
		if (!searchQuery) return projects;
		const query = searchQuery.toLowerCase();
		return projects.filter(
			(project) =>
				project.name.toLowerCase().includes(query) ||
				project.description?.toLowerCase().includes(query),
		);
	}, [projects, searchQuery]);

	const userData = {
		name: session?.data?.user.name || "User",
		email: session?.data?.user.email || "user@example.com",
		avatar:
			session?.data?.user.image ||
			`https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.data?.user.name || "User"}`,
	};

	return (
		<SidebarProvider>
			<AppSidebar user={userData} />
			<SidebarInset>
				<div className="@container/main flex min-h-screen flex-col">
					<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
						<div className="flex h-16 items-center gap-2 px-4 lg:px-6">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="mr-2 h-4" />
							<div className="flex flex-1 items-center justify-between gap-4">
								<div className="flex-1">
									<h1 className="font-bold text-xl tracking-tight lg:text-2xl">
										Projects
									</h1>
									<p className="text-muted-foreground text-sm">
										Manage your video collaboration projects
									</p>
								</div>

								<Link to="/projects/new">
									<Button size="sm">
										<IconPlus className="mr-2 size-4" />
										<span className="hidden sm:inline">New Project</span>
									</Button>
								</Link>
							</div>
						</div>
					</header>

					<div className="flex-1 space-y-6 p-4 pb-8 lg:p-6">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="relative w-full max-w-sm">
								<IconSearch className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
								<Input
									placeholder="Search projects..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9"
								/>
							</div>

							<Tabs
								value={activeTab}
								onValueChange={(v) => setActiveTab(v as "active" | "archived")}
							>
								<TabsList>
									<TabsTrigger value="active">Active</TabsTrigger>
									<TabsTrigger value="archived">Archived</TabsTrigger>
								</TabsList>
							</Tabs>
						</div>

						{isLoading ? (
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{[1, 2, 3].map((i) => (
									<Card key={i} className="animate-pulse">
										<CardHeader className="space-y-2">
											<div className="h-5 w-3/4 rounded bg-muted" />
											<div className="h-4 w-1/2 rounded bg-muted" />
										</CardHeader>
										<CardContent>
											<div className="h-16 rounded bg-muted" />
										</CardContent>
									</Card>
								))}
							</div>
						) : filteredProjects.length === 0 ? (
							<Card className="flex flex-col items-center justify-center py-16">
								<IconFolder className="mb-4 size-12 text-muted-foreground" />
								<CardTitle className="mb-2">No projects found</CardTitle>
								<CardDescription className="mb-4 text-center">
									{searchQuery
										? "Try adjusting your search query"
										: activeTab === "active"
											? "Create your first project to get started"
											: "No archived projects"}
								</CardDescription>
								{!searchQuery && activeTab === "active" && (
									<Link to="/projects/new">
										<Button>
											<IconPlus className="mr-2 size-4" />
											Create Project
										</Button>
									</Link>
								)}
							</Card>
						) : (
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{filteredProjects.map((project) => (
									<ProjectCard
										key={project.id}
										project={project}
										onArchive={() =>
											activeTab === "active"
												? archiveProject(project.id)
												: unarchiveProject(project.id)
										}
										onDelete={() => deleteProject(project.id)}
										onDuplicate={() => duplicateProject(project.id)}
										isArchived={activeTab === "archived"}
									/>
								))}
							</div>
						)}
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

function ProjectCard({
	project,
	onArchive,
	onDelete,
	onDuplicate,
	isArchived,
}: {
	project: Project;
	onArchive: () => void;
	onDelete: () => void;
	onDuplicate: () => void;
	isArchived: boolean;
}) {
	const roleColors = {
		owner: "bg-primary/10 text-primary",
		editor: "bg-blue-500/10 text-blue-500",
		reviewer: "bg-amber-500/10 text-amber-500",
		viewer: "bg-muted text-muted-foreground",
	};

	return (
		<Card className="group relative transition-shadow hover:shadow-md">
			<Link to="/projects/$id" params={{ id: project.id }}>
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-2">
							{project.color && (
								<div
									className="size-3 rounded-full"
									style={{ backgroundColor: project.color }}
								/>
							)}
							<CardTitle className="line-clamp-1 text-lg">
								{project.name}
							</CardTitle>
						</div>
						<Badge variant="secondary" className={roleColors[project.role]}>
							{project.role}
						</Badge>
					</div>
					{project.description && (
						<CardDescription className="line-clamp-2">
							{project.description}
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-4 text-muted-foreground text-sm">
						<div className="flex items-center gap-1">
							<IconUsers className="size-4" />
							<span>{project.memberCount}</span>
						</div>
						<div className="flex items-center gap-1">
							<span>{project.videoCount} videos</span>
						</div>
						<div className="flex items-center gap-1">
							<span>{project.commentCount} comments</span>
						</div>
					</div>
				</CardContent>
			</Link>

			<div className="absolute top-3 right-3">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
							onClick={(e) => e.preventDefault()}
						>
							<IconDots className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onDuplicate}>
							<IconCopy className="mr-2 size-4" />
							Duplicate
						</DropdownMenuItem>
						<DropdownMenuItem onClick={onArchive}>
							<IconArchive className="mr-2 size-4" />
							{isArchived ? "Unarchive" : "Archive"}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={onDelete}
							className="text-destructive focus:text-destructive"
						>
							<IconTrash className="mr-2 size-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</Card>
	);
}
