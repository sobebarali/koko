import { IconArrowLeft } from "@tabler/icons-react";
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
import { useCreateProject } from "@/hooks/use-projects";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/projects/new")({
	component: NewProjectPage,
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

function NewProjectPage() {
	const { session } = Route.useRouteContext();
	const navigate = useNavigate();
	const { createProject, isCreating } = useCreateProject();

	const userData = {
		name: session.data?.user.name || "User",
		email: session.data?.user.email || "user@example.com",
		avatar:
			session.data?.user.image ||
			`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.data?.user.name || "User"}`,
	};

	const handleSubmit = async (values: {
		name: string;
		description?: string;
		color?: string;
	}) => {
		const result = await createProject(values);
		navigate({ to: "/projects/$id", params: { id: result.id } });
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

							<Link to="/projects">
								<Button variant="ghost" size="sm">
									<IconArrowLeft className="mr-2 size-4" />
									Back to Projects
								</Button>
							</Link>
						</div>
					</header>

					<div className="flex-1 p-4 pb-8 lg:p-6">
						<div className="mx-auto max-w-2xl">
							<Card>
								<CardHeader>
									<CardTitle>Create New Project</CardTitle>
									<CardDescription>
										Start a new video collaboration project
									</CardDescription>
								</CardHeader>
								<CardContent>
									<ProjectForm
										onSubmit={handleSubmit}
										isSubmitting={isCreating}
										submitLabel="Create Project"
									/>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
