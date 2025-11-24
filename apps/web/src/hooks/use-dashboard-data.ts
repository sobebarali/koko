/**
 * Dashboard Data Hooks
 * Centralized hooks for fetching dashboard data
 * TODO: Replace mock data with actual tRPC API calls
 */

import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import {
	mockChartData,
	mockMetrics,
	mockProjects,
	mockRecentActivity,
	mockTeamMembers,
} from "@/lib/mock-data";
import type {
	ChartDataPoint,
	DashboardMetrics,
	RecentActivity,
	TeamMember,
	VideoProject,
} from "@/types/dashboard";
// import { trpc } from "@/utils/trpc";

/**
 * Fetch dashboard KPI metrics
 * TODO: Replace with: trpc.dashboard.getMetrics.query()
 */
export function useDashboardMetrics(): UseQueryResult<DashboardMetrics, Error> {
	return useQuery({
		queryKey: ["dashboard", "metrics"],
		queryFn: async () => {
			// Simulate API delay
			await new Promise((resolve) => setTimeout(resolve, 300));
			return mockMetrics;
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Fetch video projects
 * TODO: Replace with: trpc.dashboard.getProjects.query()
 */
export function useDashboardProjects(): UseQueryResult<VideoProject[], Error> {
	return useQuery({
		queryKey: ["dashboard", "projects"],
		queryFn: async () => {
			// Simulate API delay
			await new Promise((resolve) => setTimeout(resolve, 400));
			return mockProjects;
		},
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Fetch chart data for review activity
 * TODO: Replace with: trpc.dashboard.getChartData.query({ dateRange })
 */
export function useDashboardChartData(
	dateRange: "7d" | "30d" | "90d" = "30d",
): UseQueryResult<ChartDataPoint[], Error> {
	return useQuery({
		queryKey: ["dashboard", "chartData", dateRange],
		queryFn: async () => {
			// Simulate API delay
			await new Promise((resolve) => setTimeout(resolve, 350));

			// Filter mock data based on date range
			// In real implementation, this filtering would happen on the server
			const now = new Date();
			const daysBack = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
			const cutoffDate = new Date();
			cutoffDate.setDate(now.getDate() - daysBack);

			return mockChartData.filter((point) => {
				const pointDate = new Date(point.date);
				return pointDate >= cutoffDate;
			});
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Fetch recent activity feed
 * TODO: Replace with: trpc.dashboard.getRecentActivity.query({ limit })
 */
export function useDashboardRecentActivity(
	limit = 10,
): UseQueryResult<RecentActivity[], Error> {
	return useQuery({
		queryKey: ["dashboard", "recentActivity", limit],
		queryFn: async () => {
			// Simulate API delay
			await new Promise((resolve) => setTimeout(resolve, 200));
			return mockRecentActivity.slice(0, limit);
		},
		staleTime: 1000 * 60, // 1 minute
	});
}

/**
 * Fetch team members
 * TODO: Replace with: trpc.dashboard.getTeamMembers.query()
 */
export function useDashboardTeamMembers(): UseQueryResult<TeamMember[], Error> {
	return useQuery({
		queryKey: ["dashboard", "teamMembers"],
		queryFn: async () => {
			// Simulate API delay
			await new Promise((resolve) => setTimeout(resolve, 250));
			return mockTeamMembers;
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Fetch a single project by ID
 * TODO: Replace with: trpc.dashboard.getProject.query({ id })
 */
export function useDashboardProject(
	projectId: string,
): UseQueryResult<VideoProject | undefined, Error> {
	return useQuery({
		queryKey: ["dashboard", "project", projectId],
		queryFn: async () => {
			// Simulate API delay
			await new Promise((resolve) => setTimeout(resolve, 300));
			return mockProjects.find((p) => p.id === projectId);
		},
		enabled: !!projectId,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Combined hook for fetching all dashboard data at once
 * Useful for the main dashboard page
 */
export function useDashboardData() {
	const metrics = useDashboardMetrics();
	const projects = useDashboardProjects();
	const chartData = useDashboardChartData();
	const recentActivity = useDashboardRecentActivity();
	const teamMembers = useDashboardTeamMembers();

	return {
		metrics,
		projects,
		chartData,
		recentActivity,
		teamMembers,
		isLoading:
			metrics.isLoading ||
			projects.isLoading ||
			chartData.isLoading ||
			recentActivity.isLoading ||
			teamMembers.isLoading,
		isError:
			metrics.isError ||
			projects.isError ||
			chartData.isError ||
			recentActivity.isError ||
			teamMembers.isError,
		error:
			metrics.error ||
			projects.error ||
			chartData.error ||
			recentActivity.error ||
			teamMembers.error,
	};
}

/**
 * Example mutation hooks (for future implementation)
 */

// export function useCreateProject() {
// 	const queryClient = useQueryClient();
//
// 	return useMutation({
// 		mutationFn: (data: CreateProjectInput) => trpc.project.create.mutate(data),
// 		onSuccess: () => {
// 			queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] });
// 		},
// 	});
// }

// export function useUpdateProjectStatus() {
// 	const queryClient = useQueryClient();
//
// 	return useMutation({
// 		mutationFn: (data: { id: string; status: ProjectStatus }) =>
// 			trpc.project.updateStatus.mutate(data),
// 		onSuccess: (_, variables) => {
// 			queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] });
// 			queryClient.invalidateQueries({ queryKey: ["dashboard", "project", variables.id] });
// 		},
// 	});
// }

// export function useDeleteProject() {
// 	const queryClient = useQueryClient();
//
// 	return useMutation({
// 		mutationFn: (projectId: string) => trpc.project.delete.mutate({ id: projectId }),
// 		onSuccess: () => {
// 			queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] });
// 			queryClient.invalidateQueries({ queryKey: ["dashboard", "metrics"] });
// 		},
// 	});
// }
