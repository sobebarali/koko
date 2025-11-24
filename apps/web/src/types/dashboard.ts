/**
 * Dashboard Types for Novi Video Collaboration Platform
 * Defines all data structures used in the dashboard interface
 */

/**
 * Video Project Status
 */
export type ProjectStatus =
	| "In Review"
	| "Approved"
	| "Needs Changes"
	| "In Progress"
	| "On Hold";

/**
 * Priority Level for Projects
 */
export type PriorityLevel = "High" | "Medium" | "Low";

/**
 * Video Project - Main data structure for dashboard
 */
export interface VideoProject {
	id: string;
	projectName: string;
	videoTitle: string;
	thumbnail: string;
	status: ProjectStatus;
	assignedTo: string;
	assignedToAvatar?: string;
	uploadedBy: string;
	uploadedByAvatar?: string;
	uploadDate: string; // ISO 8601 date string
	dueDate: string; // ISO 8601 date string
	duration: string; // "MM:SS" format
	commentsCount: number;
	annotationsCount: number;
	priority: PriorityLevel;
	tags?: string[];
	fileSize?: string; // "1.2 GB"
	resolution?: string; // "1920x1080"
}

/**
 * Dashboard KPI Metrics
 */
export interface DashboardMetrics {
	activeProjects: {
		count: number;
		trend: number; // Percentage change, e.g., 12 means +12%
		trendDirection: "up" | "down" | "neutral";
	};
	pendingReviews: {
		count: number;
		urgent: number; // Count of overdue items
		trend: number;
		trendDirection: "up" | "down" | "neutral";
	};
	totalComments: {
		count: number;
		recent: number; // Comments in last 24 hours
		trend: number;
		trendDirection: "up" | "down" | "neutral";
	};
	teamMembersActive: {
		count: number;
		online: number; // Currently online
		trend: number;
		trendDirection: "up" | "down" | "neutral";
	};
}

/**
 * Chart Data Point for Review Activity
 */
export interface ChartDataPoint {
	date: string; // ISO 8601 date string
	reviews: number;
	comments: number;
}

/**
 * Chart Data Series
 */
export interface ChartData {
	dataPoints: ChartDataPoint[];
	dateRange: "7d" | "30d" | "90d";
	metric: "reviews" | "comments";
}

/**
 * Recent Activity Item
 */
export interface RecentActivity {
	id: string;
	type: "comment" | "review" | "upload" | "approval" | "change_request";
	projectId: string;
	projectName: string;
	userName: string;
	userAvatar?: string;
	timestamp: string; // ISO 8601 date string
	description: string;
}

/**
 * Team Member
 */
export interface TeamMember {
	id: string;
	name: string;
	email: string;
	avatar?: string;
	role: "Admin" | "Reviewer" | "Creator" | "Viewer";
	isOnline: boolean;
	lastActive: string; // ISO 8601 date string
}

/**
 * Filter Options for Data Table
 */
export interface ProjectFilters {
	status?: ProjectStatus[];
	priority?: PriorityLevel[];
	assignedTo?: string[];
	searchQuery?: string;
	dateRange?: {
		start: string;
		end: string;
	};
}

/**
 * Table Sort Configuration
 */
export interface TableSort {
	column: keyof VideoProject;
	direction: "asc" | "desc";
}

/**
 * Pagination Configuration
 */
export interface PaginationConfig {
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

/**
 * Dashboard Data - Complete dashboard state
 */
export interface DashboardData {
	metrics: DashboardMetrics;
	projects: VideoProject[];
	chartData: ChartData;
	recentActivity: RecentActivity[];
	teamMembers: TeamMember[];
}

/**
 * Status Badge Configuration
 */
export interface StatusBadgeConfig {
	label: string;
	variant:
		| "default"
		| "secondary"
		| "destructive"
		| "outline"
		| "success"
		| "warning";
	color: string;
}

/**
 * Map of status to badge configuration
 */
export const STATUS_BADGE_MAP: Record<ProjectStatus, StatusBadgeConfig> = {
	"In Review": {
		label: "In Review",
		variant: "default",
		color: "bg-blue-500",
	},
	Approved: {
		label: "Approved",
		variant: "success",
		color: "bg-green-500",
	},
	"Needs Changes": {
		label: "Needs Changes",
		variant: "warning",
		color: "bg-amber-500",
	},
	"In Progress": {
		label: "In Progress",
		variant: "secondary",
		color: "bg-gray-500",
	},
	"On Hold": {
		label: "On Hold",
		variant: "outline",
		color: "bg-gray-400",
	},
};

/**
 * Map of priority to color configuration
 */
export const PRIORITY_COLOR_MAP: Record<PriorityLevel, string> = {
	High: "text-red-500",
	Medium: "text-yellow-500",
	Low: "text-gray-400",
};
