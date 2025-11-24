"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ChartDataPoint } from "@/types/dashboard";

interface ChartAreaInteractiveProps {
	data: ChartDataPoint[];
}

const chartConfig = {
	activity: {
		label: "Activity",
	},
	reviews: {
		label: "Reviews",
		color: "hsl(var(--chart-1))",
	},
	comments: {
		label: "Comments",
		color: "hsl(var(--chart-2))",
	},
} satisfies ChartConfig;

export function ChartAreaInteractive({ data }: ChartAreaInteractiveProps) {
	const isMobile = useIsMobile();
	const [timeRange, setTimeRange] = React.useState("30d");

	// Auto-adjust time range for mobile
	React.useEffect(() => {
		if (isMobile) {
			setTimeRange("7d");
		}
	}, [isMobile]);

	// Filter data based on selected time range
	const filteredData = React.useMemo(() => {
		if (!data || data.length === 0) return [];

		const referenceDate = new Date(data[data.length - 1].date);
		let daysToSubtract = 30;

		if (timeRange === "90d") {
			daysToSubtract = 90;
		} else if (timeRange === "7d") {
			daysToSubtract = 7;
		}

		const startDate = new Date(referenceDate);
		startDate.setDate(startDate.getDate() - daysToSubtract);

		return data.filter((item) => {
			const date = new Date(item.date);
			return date >= startDate;
		});
	}, [data, timeRange]);

	// Calculate total activity for the selected period
	const totalActivity = React.useMemo(() => {
		return filteredData.reduce(
			(acc, item) => ({
				reviews: acc.reviews + item.reviews,
				comments: acc.comments + item.comments,
			}),
			{ reviews: 0, comments: 0 },
		);
	}, [filteredData]);

	// Get time range label
	const getTimeRangeLabel = (): string => {
		switch (timeRange) {
			case "90d":
				return "Last 90 days";
			case "30d":
				return "Last 30 days";
			case "7d":
				return "Last 7 days";
			default:
				return "Last 30 days";
		}
	};

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Review Activity</CardTitle>
				<CardDescription>
					<span className="@[540px]/card:block hidden">
						{totalActivity.reviews} reviews completed, {totalActivity.comments}{" "}
						comments added - {getTimeRangeLabel()}
					</span>
					<span className="@[540px]/card:hidden">{getTimeRangeLabel()}</span>
				</CardDescription>
				<CardAction>
					<ToggleGroup
						type="single"
						value={timeRange}
						onValueChange={setTimeRange}
						variant="outline"
						className="*:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex hidden"
					>
						<ToggleGroupItem value="90d">90 days</ToggleGroupItem>
						<ToggleGroupItem value="30d">30 days</ToggleGroupItem>
						<ToggleGroupItem value="7d">7 days</ToggleGroupItem>
					</ToggleGroup>
					<Select value={timeRange} onValueChange={setTimeRange}>
						<SelectTrigger
							className="flex @[767px]/card:hidden w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
							size="sm"
							aria-label="Select time range"
						>
							<SelectValue placeholder="Last 30 days" />
						</SelectTrigger>
						<SelectContent className="rounded-xl">
							<SelectItem value="90d" className="rounded-lg">
								Last 90 days
							</SelectItem>
							<SelectItem value="30d" className="rounded-lg">
								Last 30 days
							</SelectItem>
							<SelectItem value="7d" className="rounded-lg">
								Last 7 days
							</SelectItem>
						</SelectContent>
					</Select>
				</CardAction>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[250px] w-full"
				>
					<AreaChart data={filteredData}>
						<defs>
							<linearGradient id="fillReviews" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-reviews)"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-reviews)"
									stopOpacity={0.1}
								/>
							</linearGradient>
							<linearGradient id="fillComments" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-comments)"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-comments)"
									stopOpacity={0.1}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							tickFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								});
							}}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={(value) => {
										return new Date(value).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										});
									}}
									indicator="dot"
								/>
							}
						/>
						<Area
							dataKey="comments"
							type="natural"
							fill="url(#fillComments)"
							stroke="var(--color-comments)"
							stackId="a"
						/>
						<Area
							dataKey="reviews"
							type="natural"
							fill="url(#fillReviews)"
							stroke="var(--color-reviews)"
							stackId="a"
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
