"use client";

import {
	CheckSquare,
	Film,
	Folder,
	LayoutDashboard,
	MessageSquare,
	Settings,
	Video,
} from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";

// Koko branding in header
function KokoLogo() {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					size="lg"
					asChild
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<a href="/dashboard">
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
							<Video className="size-4" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">Koko</span>
							<span className="truncate text-xs">Video Collaboration</span>
						</div>
					</a>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

// Video collaboration navigation data
const navMainData = [
	{
		title: "Dashboard",
		url: "/dashboard",
		icon: LayoutDashboard,
		isActive: true,
		items: [
			{
				title: "Overview",
				url: "/dashboard",
			},
			{
				title: "Analytics",
				url: "/dashboard/analytics",
			},
			{
				title: "Activity",
				url: "/dashboard/activity",
			},
		],
	},
	{
		title: "Projects",
		url: "/projects",
		icon: Folder,
		items: [
			{
				title: "All Projects",
				url: "/projects",
			},
			{
				title: "Create New",
				url: "/projects/new",
			},
		],
	},
	{
		title: "Videos",
		url: "/videos",
		icon: Film,
		items: [
			{
				title: "All Videos",
				url: "/videos",
			},
			{
				title: "Recent Uploads",
				url: "/videos/recent",
			},
			{
				title: "Favorites",
				url: "/videos/favorites",
			},
			{
				title: "Archived",
				url: "/videos/archived",
			},
		],
	},
	{
		title: "Reviews",
		url: "/reviews",
		icon: CheckSquare,
		items: [
			{
				title: "Pending",
				url: "/reviews/pending",
			},
			{
				title: "Completed",
				url: "/reviews/completed",
			},
			{
				title: "Assigned to Me",
				url: "/reviews/assigned",
			},
		],
	},
	{
		title: "Comments",
		url: "/comments",
		icon: MessageSquare,
		items: [
			{
				title: "All Comments",
				url: "/comments",
			},
			{
				title: "Mentions",
				url: "/comments/mentions",
			},
			{
				title: "Unresolved",
				url: "/comments/unresolved",
			},
		],
	},
	{
		title: "Settings",
		url: "/settings",
		icon: Settings,
		items: [
			{
				title: "Account",
				url: "/settings/account",
			},
			{
				title: "Team",
				url: "/settings/team",
			},
			{
				title: "Preferences",
				url: "/settings/preferences",
			},
			{
				title: "Integrations",
				url: "/settings/integrations",
			},
		],
	},
];

// User data (will be replaced with actual session data in route)
const defaultUserData = {
	name: "User",
	email: "user@example.com",
	avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=User",
};

export function AppSidebar({
	user = defaultUserData,
	recentProjects = [],
	...props
}: React.ComponentProps<typeof Sidebar> & {
	user?: {
		name: string;
		email: string;
		avatar: string;
	};
	recentProjects?: Array<{ id: string; name: string }>;
}) {
	// Convert to sidebar format
	const projectsForNav = recentProjects.slice(0, 5).map((project) => ({
		name: project.name,
		url: `/projects/${project.id}`,
		icon: Folder,
	}));

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<KokoLogo />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navMainData} />
				<NavProjects projects={projectsForNav} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
