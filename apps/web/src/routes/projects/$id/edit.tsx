import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectForm } from "@/components/project-form";
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
import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { authClient } from "@/lib/auth-client";
import { getAppUrl, isLandingDomain } from "@/lib/domain";

export const Route = createFileRoute("/projects/$id/edit")({
	component: EditProjectPage,
	beforeLoad: async ({ params }) => {
		// Redirect to app domain if on landing domain
		if (isLandingDomain()) {
			window.location.href = getAppUrl({ path: `/projects/${params.id}/edit` });
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

function EditProjectPage() {
	const { session } = Route.useRouteContext();
	const { id } = Route.useParams();
	const navigate = useNavigate();

	const { project, isLoading, error } = useProject({ id });
	const { updateProject, isUpdating } = useUpdateProject();

	const userData = {
		name: session?.data?.user.name || "User",
		email: session?.data?.user.email || "user@example.com",
		avatar:
			session?.data?.user.image ||
			`https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.data?.user.name || "User"}`,
	};

	const handleSubmit = async (values: {
		name: string;
		description?: string;
		color?: string;
	}) => {
		await updateProject({ id, ...values });
		navigate({ to: "/projects/$id", params: { id } });
	};

	const isOwner = project?.ownerId === session?.data?.user.id;

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
						</div>
					</header>

					<div className="flex-1 p-4 pb-8 lg:p-6">
						<div className="mx-auto max-w-2xl">
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
							) : !isOwner ? (
								<Card className="flex flex-col items-center justify-center py-16">
									<CardTitle className="mb-2">Access Denied</CardTitle>
									<CardDescription>
										Only the project owner can edit this project
									</CardDescription>
									<Link to="/projects/$id" params={{ id }} className="mt-4">
										<Button variant="outline">Back to Project</Button>
									</Link>
								</Card>
							) : project ? (
								<Card>
									<CardHeader>
										<CardTitle>Edit Project</CardTitle>
										<CardDescription>
											Update your project details
										</CardDescription>
									</CardHeader>
									<CardContent>
										<ProjectForm
											defaultValues={{
												name: project.name,
												description: project.description ?? undefined,
												color: project.color ?? undefined,
											}}
											onSubmit={handleSubmit}
											isSubmitting={isUpdating}
											submitLabel="Save Changes"
										/>
									</CardContent>
								</Card>
							) : null}
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
