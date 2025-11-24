/**
 * Mock Data for Koko Dashboard
 * This file contains organized mock data for development and testing
 * TODO: Replace with actual API calls using tRPC
 */

import projectsData from "@/app/dashboard/data.json";
import type {
	ChartDataPoint,
	DashboardData,
	DashboardMetrics,
	RecentActivity,
	TeamMember,
	VideoProject,
} from "@/types/dashboard";

/**
 * Video Projects - Imported from data.json
 */
export const mockProjects: VideoProject[] = projectsData as VideoProject[];

/**
 * Dashboard KPI Metrics
 */
export const mockMetrics: DashboardMetrics = {
	activeProjects: {
		count: mockProjects.filter(
			(p) => p.status === "In Review" || p.status === "In Progress",
		).length,
		trend: 12,
		trendDirection: "up",
	},
	pendingReviews: {
		count: mockProjects.filter((p) => p.status === "In Review").length,
		urgent: mockProjects.filter(
			(p) =>
				p.status === "In Review" &&
				new Date(p.dueDate) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
		).length,
		trend: -5,
		trendDirection: "down",
	},
	totalComments: {
		count: mockProjects.reduce((sum, p) => sum + p.commentsCount, 0),
		recent: mockProjects
			.filter((p) => {
				const uploadDate = new Date(p.uploadDate);
				const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
				return uploadDate > dayAgo;
			})
			.reduce((sum, p) => sum + p.commentsCount, 0),
		trend: 18,
		trendDirection: "up",
	},
	teamMembersActive: {
		count: 8,
		online: 5,
		trend: 0,
		trendDirection: "neutral",
	},
};

/**
 * Chart Data - Review Activity Over Time (Last 30 Days)
 */
export const mockChartData: ChartDataPoint[] = [
	{ date: "2024-01-01", reviews: 2, comments: 8 },
	{ date: "2024-01-02", reviews: 3, comments: 12 },
	{ date: "2024-01-03", reviews: 1, comments: 5 },
	{ date: "2024-01-04", reviews: 4, comments: 18 },
	{ date: "2024-01-05", reviews: 2, comments: 9 },
	{ date: "2024-01-06", reviews: 0, comments: 3 },
	{ date: "2024-01-07", reviews: 1, comments: 4 },
	{ date: "2024-01-08", reviews: 5, comments: 22 },
	{ date: "2024-01-09", reviews: 3, comments: 14 },
	{ date: "2024-01-10", reviews: 2, comments: 11 },
	{ date: "2024-01-11", reviews: 4, comments: 19 },
	{ date: "2024-01-12", reviews: 3, comments: 15 },
	{ date: "2024-01-13", reviews: 1, comments: 6 },
	{ date: "2024-01-14", reviews: 2, comments: 10 },
	{ date: "2024-01-15", reviews: 6, comments: 28 },
	{ date: "2024-01-16", reviews: 4, comments: 17 },
	{ date: "2024-01-17", reviews: 3, comments: 13 },
	{ date: "2024-01-18", reviews: 5, comments: 24 },
	{ date: "2024-01-19", reviews: 2, comments: 9 },
	{ date: "2024-01-20", reviews: 1, comments: 5 },
	{ date: "2024-01-21", reviews: 3, comments: 16 },
	{ date: "2024-01-22", reviews: 4, comments: 20 },
	{ date: "2024-01-23", reviews: 2, comments: 11 },
	{ date: "2024-01-24", reviews: 3, comments: 14 },
	{ date: "2024-01-25", reviews: 5, comments: 23 },
	{ date: "2024-01-26", reviews: 2, comments: 10 },
	{ date: "2024-01-27", reviews: 4, comments: 18 },
	{ date: "2024-01-28", reviews: 3, comments: 15 },
	{ date: "2024-01-29", reviews: 6, comments: 27 },
	{ date: "2024-01-30", reviews: 4, comments: 19 },
];

/**
 * Recent Activity Feed
 */
export const mockRecentActivity: RecentActivity[] = [
	{
		id: "activity-001",
		type: "comment",
		projectId: "proj-001",
		projectName: "Summer Campaign 2024",
		userName: "Sarah Chen",
		userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
		timestamp: "2024-01-18T14:23:00Z",
		description: "Added 3 new comments on Hero Video - Final Cut v3",
	},
	{
		id: "activity-002",
		type: "approval",
		projectId: "proj-002",
		projectName: "Product Launch Q1",
		userName: "James Wilson",
		userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
		timestamp: "2024-01-18T13:15:00Z",
		description: "Approved Feature Demo - Mobile App",
	},
	{
		id: "activity-003",
		type: "change_request",
		projectId: "proj-003",
		projectName: "Brand Refresh 2024",
		userName: "Alex Kumar",
		userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
		timestamp: "2024-01-18T12:45:00Z",
		description: "Requested changes on Logo Animation Sequence",
	},
	{
		id: "activity-004",
		type: "upload",
		projectId: "proj-014",
		projectName: "Investor Pitch",
		userName: "Jessica Lee",
		userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica",
		timestamp: "2024-01-18T11:20:00Z",
		description: "Uploaded Company Overview Presentation",
	},
	{
		id: "activity-005",
		type: "review",
		projectId: "proj-007",
		projectName: "Event Highlight Reel",
		userName: "Alex Kumar",
		userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
		timestamp: "2024-01-18T10:30:00Z",
		description: "Started review of Tech Conference 2024 - Day 1",
	},
	{
		id: "activity-006",
		type: "comment",
		projectId: "proj-011",
		projectName: "Ad Campaign - Winter",
		userName: "Sarah Chen",
		userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
		timestamp: "2024-01-18T09:15:00Z",
		description: "Added feedback on 15s TV Spot - Version A",
	},
	{
		id: "activity-007",
		type: "approval",
		projectId: "proj-010",
		projectName: "Behind The Scenes",
		userName: "James Wilson",
		userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
		timestamp: "2024-01-17T16:45:00Z",
		description: "Approved Studio Tour Vlog",
	},
	{
		id: "activity-008",
		type: "upload",
		projectId: "proj-017",
		projectName: "Product Launch Q1",
		userName: "Andrew Martinez",
		userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Andrew",
		timestamp: "2024-01-17T15:30:00Z",
		description: "Uploaded Teaser Trailer - 30s",
	},
];

/**
 * Team Members
 */
export const mockTeamMembers: TeamMember[] = [
	{
		id: "user-001",
		name: "Sarah Chen",
		email: "sarah.chen@koko.com",
		avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
		role: "Reviewer",
		isOnline: true,
		lastActive: "2024-01-18T14:30:00Z",
	},
	{
		id: "user-002",
		name: "James Wilson",
		email: "james.wilson@koko.com",
		avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
		role: "Admin",
		isOnline: true,
		lastActive: "2024-01-18T14:25:00Z",
	},
	{
		id: "user-003",
		name: "Alex Kumar",
		email: "alex.kumar@koko.com",
		avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
		role: "Reviewer",
		isOnline: true,
		lastActive: "2024-01-18T14:20:00Z",
	},
	{
		id: "user-004",
		name: "Rachel Thompson",
		email: "rachel.thompson@koko.com",
		avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rachel",
		role: "Reviewer",
		isOnline: false,
		lastActive: "2024-01-18T12:10:00Z",
	},
	{
		id: "user-005",
		name: "Marcus Rodriguez",
		email: "marcus.rodriguez@koko.com",
		avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
		role: "Creator",
		isOnline: true,
		lastActive: "2024-01-18T14:15:00Z",
	},
	{
		id: "user-006",
		name: "Emily Zhang",
		email: "emily.zhang@koko.com",
		avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
		role: "Creator",
		isOnline: true,
		lastActive: "2024-01-18T14:10:00Z",
	},
	{
		id: "user-007",
		name: "Olivia Martinez",
		email: "olivia.martinez@koko.com",
		avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia",
		role: "Creator",
		isOnline: false,
		lastActive: "2024-01-18T11:30:00Z",
	},
	{
		id: "user-008",
		name: "David Lee",
		email: "david.lee@koko.com",
		avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
		role: "Viewer",
		isOnline: false,
		lastActive: "2024-01-18T10:45:00Z",
	},
];

/**
 * Complete Dashboard Data Export
 */
export const mockDashboardData: DashboardData = {
	metrics: mockMetrics,
	projects: mockProjects,
	chartData: {
		dataPoints: mockChartData,
		dateRange: "30d",
		metric: "reviews",
	},
	recentActivity: mockRecentActivity,
	teamMembers: mockTeamMembers,
};

/**
 * Utility Functions for Mock Data
 */

/**
 * Get projects by status
 */
export function getProjectsByStatus(
	status: VideoProject["status"],
): VideoProject[] {
	return mockProjects.filter((project) => project.status === status);
}

/**
 * Get projects by priority
 */
export function getProjectsByPriority(
	priority: VideoProject["priority"],
): VideoProject[] {
	return mockProjects.filter((project) => project.priority === priority);
}

/**
 * Get projects assigned to a specific user
 */
export function getProjectsByAssignee(assigneeName: string): VideoProject[] {
	return mockProjects.filter((project) => project.assignedTo === assigneeName);
}

/**
 * Get urgent projects (due within 2 days)
 */
export function getUrgentProjects(): VideoProject[] {
	const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
	return mockProjects.filter((project) => {
		const dueDate = new Date(project.dueDate);
		return dueDate <= twoDaysFromNow && project.status !== "Approved";
	});
}

/**
 * Get projects uploaded in the last 24 hours
 */
export function getRecentlyUploadedProjects(): VideoProject[] {
	const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
	return mockProjects.filter(
		(project) => new Date(project.uploadDate) > oneDayAgo,
	);
}

/**
 * Calculate total comments across all projects
 */
export function getTotalComments(): number {
	return mockProjects.reduce((sum, project) => sum + project.commentsCount, 0);
}

/**
 * Calculate total annotations across all projects
 */
export function getTotalAnnotations(): number {
	return mockProjects.reduce(
		(sum, project) => sum + project.annotationsCount,
		0,
	);
}

/**
 * Get online team members count
 */
export function getOnlineTeamMembersCount(): number {
	return mockTeamMembers.filter((member) => member.isOnline).length;
}

/**
 * Search projects by query (searches in projectName and videoTitle)
 */
export function searchProjects(query: string): VideoProject[] {
	const lowerQuery = query.toLowerCase();
	return mockProjects.filter(
		(project) =>
			project.projectName.toLowerCase().includes(lowerQuery) ||
			project.videoTitle.toLowerCase().includes(lowerQuery) ||
			project.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
	);
}
