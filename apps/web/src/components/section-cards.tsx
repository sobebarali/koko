import {
	IconAlertCircle,
	IconMessageCircle,
	IconTrendingDown,
	IconTrendingUp,
	IconUsers,
	IconVideo,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { DashboardMetrics } from "@/types/dashboard";

interface SectionCardsProps {
	metrics: DashboardMetrics;
}

export function SectionCards({ metrics }: SectionCardsProps) {
	const formatTrend = (trend: number): string => {
		const sign = trend > 0 ? "+" : "";
		return `${sign}${trend}%`;
	};

	return (
		<div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 dark:*:data-[slot=card]:bg-card">
			{/* Active Projects Card */}
			<Card className="@container/card">
				<CardHeader>
					<CardDescription className="flex items-center gap-2">
						<IconVideo className="size-4" />
						Active Projects
					</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						{metrics.activeProjects.count}
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							{metrics.activeProjects.trendDirection === "up" ? (
								<IconTrendingUp />
							) : (
								<IconTrendingDown />
							)}
							{formatTrend(metrics.activeProjects.trend)}
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						{metrics.activeProjects.trendDirection === "up"
							? "Growing project portfolio"
							: "Steady progress"}
						{metrics.activeProjects.trendDirection === "up" ? (
							<IconTrendingUp className="size-4" />
						) : (
							<IconTrendingDown className="size-4" />
						)}
					</div>
					<div className="text-muted-foreground">
						Projects in review or in progress
					</div>
				</CardFooter>
			</Card>

			{/* Pending Reviews Card */}
			<Card className="@container/card">
				<CardHeader>
					<CardDescription className="flex items-center gap-2">
						<IconAlertCircle className="size-4" />
						Pending Reviews
					</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						{metrics.pendingReviews.count}
						{metrics.pendingReviews.urgent > 0 && (
							<span className="ml-2 text-base text-destructive">
								({metrics.pendingReviews.urgent} urgent)
							</span>
						)}
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							{metrics.pendingReviews.trendDirection === "up" ? (
								<IconTrendingUp />
							) : (
								<IconTrendingDown />
							)}
							{formatTrend(metrics.pendingReviews.trend)}
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						{metrics.pendingReviews.trendDirection === "down"
							? "Clearing backlog"
							: "Reviews piling up"}
						{metrics.pendingReviews.trendDirection === "down" ? (
							<IconTrendingDown className="size-4" />
						) : (
							<IconTrendingUp className="size-4" />
						)}
					</div>
					<div className="text-muted-foreground">
						{metrics.pendingReviews.urgent > 0
							? `${metrics.pendingReviews.urgent} videos due within 2 days`
							: "All reviews on track"}
					</div>
				</CardFooter>
			</Card>

			{/* Total Comments Card */}
			<Card className="@container/card">
				<CardHeader>
					<CardDescription className="flex items-center gap-2">
						<IconMessageCircle className="size-4" />
						Total Comments
					</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						{metrics.totalComments.count}
						{metrics.totalComments.recent > 0 && (
							<span className="ml-2 text-base text-muted-foreground">
								(+{metrics.totalComments.recent} today)
							</span>
						)}
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							{metrics.totalComments.trendDirection === "up" ? (
								<IconTrendingUp />
							) : (
								<IconTrendingDown />
							)}
							{formatTrend(metrics.totalComments.trend)}
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						{metrics.totalComments.trendDirection === "up"
							? "Active collaboration"
							: "Collaboration slowing"}
						{metrics.totalComments.trendDirection === "up" ? (
							<IconTrendingUp className="size-4" />
						) : (
							<IconTrendingDown className="size-4" />
						)}
					</div>
					<div className="text-muted-foreground">
						Feedback across all projects
					</div>
				</CardFooter>
			</Card>

			{/* Team Members Active Card */}
			<Card className="@container/card">
				<CardHeader>
					<CardDescription className="flex items-center gap-2">
						<IconUsers className="size-4" />
						Team Members
					</CardDescription>
					<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
						{metrics.teamMembersActive.count}
						<span className="ml-2 text-base text-green-600 dark:text-green-400">
							({metrics.teamMembersActive.online} online)
						</span>
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							{metrics.teamMembersActive.trendDirection === "neutral" && (
								<span className="flex items-center gap-1">
									<span className="size-2 rounded-full bg-current" />
									Stable
								</span>
							)}
							{metrics.teamMembersActive.trendDirection === "up" && (
								<>
									<IconTrendingUp />
									{formatTrend(metrics.teamMembersActive.trend)}
								</>
							)}
							{metrics.teamMembersActive.trendDirection === "down" && (
								<>
									<IconTrendingDown />
									{formatTrend(metrics.teamMembersActive.trend)}
								</>
							)}
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						{metrics.teamMembersActive.online > 0
							? "Team actively collaborating"
							: "Quiet period"}
					</div>
					<div className="text-muted-foreground">
						{metrics.teamMembersActive.online} members currently working
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}
