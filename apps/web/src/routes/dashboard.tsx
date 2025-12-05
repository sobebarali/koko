import { IconPlus, IconUpload } from "@tabler/icons-react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { VideoProjectsTable } from "@/components/video-projects-table";
import { type Project, useProjects } from "@/hooks/use-projects";
import { authClient } from "@/lib/auth-client";
import { getAppUrl, isLandingDomain } from "@/lib/domain";
import type {
	ChartDataPoint,
	DashboardMetrics,
	VideoProject,
} from "@/types/dashboard";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async () => {
		// Redirect to app domain if on landing domain
		if (isLandingDomain()) {
			window.location.href = getAppUrl({ path: "/dashboard" });
			// Throw to prevent route from loading while redirect happens
			throw new Error("Redirecting to app domain");
		}

		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				throw: true,
			});
		}
		// @ts-expect-error - customer plugin may not be configured
		const { data: customerState } = (await authClient.customer?.state?.()) ?? {
			data: null,
		};
		return { session, customerState };
	},
});

// Helper function to adapt API Project to VideoProject format for the table
function adaptProjectToVideoProject(project: Project): VideoProject {
	return {
		id: project.id,
		projectName: project.name,
		videoTitle: project.name,
		thumbnail: project.thumbnail || "/placeholder.svg",
		status: "In Progress",
		assignedTo: "—",
		assignedToAvatar: "/placeholder.svg",
		uploadedBy: "—",
		uploadedByAvatar: "/placeholder.svg",
		dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		priority: "Medium",
		duration: "—",
		resolution: "—",
		commentsCount: project.commentCount,
		annotationsCount: 0,
		uploadDate: project.createdAt,
		tags: [],
	};
}

// Placeholder chart data (empty for now)
const placeholderChartData: ChartDataPoint[] = [];

function RouteComponent() {
	const { session, customerState } = Route.useRouteContext();
	const { projects } = useProjects({ status: "active" });

	const hasProSubscription =
		(customerState?.activeSubscriptions?.length ?? 0) > 0;

	// Get current date for greeting
	const currentDate = new Date().toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});

	// User data for sidebar
	const userData = {
		name: session.data?.user.name || "User",
		email: session.data?.user.email || "user@example.com",
		avatar:
			session.data?.user.image ||
			`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.data?.user.name || "User"}`,
	};

	// Placeholder metrics computed from real project data
	const dashboardMetrics: DashboardMetrics = {
		activeProjects: {
			count: projects.length,
			trend: 0,
			trendDirection: "neutral",
		},
		pendingReviews: {
			count: 0,
			urgent: 0,
			trend: 0,
			trendDirection: "neutral",
		},
		totalComments: {
			count: projects.reduce((sum, p) => sum + p.commentCount, 0),
			recent: 0,
			trend: 0,
			trendDirection: "neutral",
		},
		teamMembersActive: {
			count: 0,
			online: 0,
			trend: 0,
			trendDirection: "neutral",
		},
	};

	// Adapt real projects for the VideoProjectsTable
	const tableProjects = projects.map(adaptProjectToVideoProject);

	// Recent projects for sidebar
	const recentProjects = projects.slice(0, 5);

	return (
		<SidebarProvider>
			<AppSidebar user={userData} recentProjects={recentProjects} />
			<SidebarInset>
				<div className="@container/main flex min-h-screen flex-col">
					{/* Header with sidebar trigger */}
					<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
						<div className="flex h-16 items-center gap-2 px-4 lg:px-6">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="mr-2 h-4" />
							<div className="flex flex-1 items-center justify-between gap-4">
								<div className="flex-1">
									<h1 className="font-bold text-xl tracking-tight lg:text-2xl">
										Welcome back, {session.data?.user.name || "there"}!
									</h1>
									<p className="text-muted-foreground text-sm">
										{currentDate} • {dashboardMetrics.pendingReviews.count}{" "}
										videos pending review
									</p>
								</div>

								<div className="flex flex-wrap gap-2">
									<Button variant="outline" size="sm" asChild>
										<Link to="/projects/new">
											<IconPlus className="mr-2 size-4" />
											<span className="hidden sm:inline">New Project</span>
										</Link>
									</Button>
									<Button size="sm" disabled title="Coming soon">
										<IconUpload className="mr-2 size-4" />
										<span className="hidden sm:inline">Upload Video</span>
									</Button>
								</div>
							</div>
						</div>

						{/* Subscription badge */}
						<div className="flex items-center gap-2 border-t px-4 py-2 lg:px-6">
							<span className="text-muted-foreground text-xs">Plan:</span>
							<span
								className={`rounded-full px-2 py-0.5 font-medium text-xs ${hasProSubscription ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
							>
								{hasProSubscription ? "Pro" : "Free"}
							</span>
							{!hasProSubscription && (
								<Button
									size="sm"
									variant="link"
									className="h-auto p-0 text-xs"
									onClick={async () => {
										// @ts-expect-error - checkout plugin may not be configured
										if (authClient.checkout) {
											// @ts-expect-error - checkout plugin may not be configured
											await authClient.checkout({ slug: "pro" });
										}
									}}
								>
									Upgrade to Pro →
								</Button>
							)}
							{hasProSubscription && (
								<Button
									size="sm"
									variant="link"
									className="h-auto p-0 text-xs"
									onClick={async () => {
										// @ts-expect-error - customer plugin may not be configured
										if (authClient.customer?.portal) {
											// @ts-expect-error - customer plugin may not be configured
											await authClient.customer.portal();
										}
									}}
								>
									Manage Subscription
								</Button>
							)}
						</div>
					</header>

					{/* Main Content */}
					<div className="flex-1 space-y-6 p-4 pb-8 lg:p-6">
						{/* KPI Metrics Cards */}
						<section aria-label="Dashboard metrics">
							<SectionCards metrics={dashboardMetrics} />
						</section>

						{/* Review Activity Chart */}
						<section aria-label="Review activity chart">
							<ChartAreaInteractive data={placeholderChartData} />
						</section>

						{/* Video Projects Table */}
						<section aria-label="Video projects" className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="font-semibold text-2xl tracking-tight">
										Active Projects
									</h2>
									<p className="text-muted-foreground text-sm">
										Manage and review your video projects
									</p>
								</div>
							</div>

							<VideoProjectsTable projects={tableProjects} />
						</section>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
