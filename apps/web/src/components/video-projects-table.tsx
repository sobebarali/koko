"use client";

import {
	IconChevronDown,
	IconChevronUp,
	IconClock,
	IconDots,
	IconDownload,
	IconEye,
	IconMessageCircle,
	IconPlayerPlay,
	IconSearch,
	IconShare,
} from "@tabler/icons-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	PriorityLevel,
	ProjectStatus,
	VideoProject,
} from "@/types/dashboard";
import { PRIORITY_COLOR_MAP, STATUS_BADGE_MAP } from "@/types/dashboard";

interface VideoProjectsTableProps {
	projects: VideoProject[];
}

type SortField =
	| "videoTitle"
	| "status"
	| "dueDate"
	| "assignedTo"
	| "priority";
type SortDirection = "asc" | "desc";

export function VideoProjectsTable({ projects }: VideoProjectsTableProps) {
	const [searchQuery, setSearchQuery] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<string>("all");
	const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
	const [sortField, setSortField] = React.useState<SortField>("dueDate");
	const [sortDirection, setSortDirection] =
		React.useState<SortDirection>("asc");
	const [currentPage, setCurrentPage] = React.useState(1);
	const [pageSize, setPageSize] = React.useState(10);

	// Filter projects
	const filteredProjects = React.useMemo(() => {
		return projects.filter((project) => {
			// Search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				const matchesSearch =
					project.projectName.toLowerCase().includes(query) ||
					project.videoTitle.toLowerCase().includes(query) ||
					project.assignedTo.toLowerCase().includes(query) ||
					project.tags?.some((tag) => tag.toLowerCase().includes(query));

				if (!matchesSearch) return false;
			}

			// Status filter
			if (statusFilter !== "all" && project.status !== statusFilter) {
				return false;
			}

			// Priority filter
			if (priorityFilter !== "all" && project.priority !== priorityFilter) {
				return false;
			}

			return true;
		});
	}, [projects, searchQuery, statusFilter, priorityFilter]);

	// Sort projects
	const sortedProjects = React.useMemo(() => {
		return [...filteredProjects].sort((a, b) => {
			let comparison = 0;

			switch (sortField) {
				case "videoTitle":
					comparison = a.videoTitle.localeCompare(b.videoTitle);
					break;
				case "status":
					comparison = a.status.localeCompare(b.status);
					break;
				case "dueDate":
					comparison =
						new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
					break;
				case "assignedTo":
					comparison = a.assignedTo.localeCompare(b.assignedTo);
					break;
				case "priority": {
					const priorityOrder: Record<PriorityLevel, number> = {
						High: 3,
						Medium: 2,
						Low: 1,
					};
					comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
					break;
				}
			}

			return sortDirection === "asc" ? comparison : -comparison;
		});
	}, [filteredProjects, sortField, sortDirection]);

	// Paginate projects
	const paginatedProjects = React.useMemo(() => {
		const startIndex = (currentPage - 1) * pageSize;
		const endIndex = startIndex + pageSize;
		return sortedProjects.slice(startIndex, endIndex);
	}, [sortedProjects, currentPage, pageSize]);

	const totalPages = Math.ceil(sortedProjects.length / pageSize);

	// Handle sort
	const handleSort = (field: SortField): void => {
		if (sortField === field) {
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	// Format date
	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = date.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays < 0) {
			return (
				<span className="font-medium text-destructive">
					{Math.abs(diffDays)}d overdue
				</span>
			) as unknown as string;
		}
		if (diffDays === 0) {
			return (
				<span className="font-medium text-destructive">Due today</span>
			) as unknown as string;
		}
		if (diffDays === 1) {
			return (
				<span className="font-medium text-amber-600">Due tomorrow</span>
			) as unknown as string;
		}
		if (diffDays <= 2) {
			return (
				<span className="font-medium text-amber-600">
					Due in {diffDays} days
				</span>
			) as unknown as string;
		}

		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	};

	// Get status badge variant
	const getStatusBadgeVariant = (status: ProjectStatus): string => {
		const config = STATUS_BADGE_MAP[status];
		return config?.variant || "default";
	};

	// Render sort icon
	const renderSortIcon = (field: SortField): React.ReactNode => {
		if (sortField !== field) return null;

		return sortDirection === "asc" ? (
			<IconChevronUp className="ml-1 inline size-4" />
		) : (
			<IconChevronDown className="ml-1 inline size-4" />
		);
	};

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				{/* Search */}
				<div className="relative flex-1 md:max-w-sm">
					<IconSearch className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
					<Input
						placeholder="Search projects, videos, or tags..."
						value={searchQuery}
						onChange={(e) => {
							setSearchQuery(e.target.value);
							setCurrentPage(1);
						}}
						className="pl-9"
					/>
				</div>

				{/* Status and Priority Filters */}
				<div className="flex gap-2">
					<Select
						value={statusFilter}
						onValueChange={(value) => {
							setStatusFilter(value);
							setCurrentPage(1);
						}}
					>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder="All Statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="In Review">In Review</SelectItem>
							<SelectItem value="Approved">Approved</SelectItem>
							<SelectItem value="Needs Changes">Needs Changes</SelectItem>
							<SelectItem value="In Progress">In Progress</SelectItem>
							<SelectItem value="On Hold">On Hold</SelectItem>
						</SelectContent>
					</Select>

					<Select
						value={priorityFilter}
						onValueChange={(value) => {
							setPriorityFilter(value);
							setCurrentPage(1);
						}}
					>
						<SelectTrigger className="w-[130px]">
							<SelectValue placeholder="All Priority" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Priority</SelectItem>
							<SelectItem value="High">High</SelectItem>
							<SelectItem value="Medium">Medium</SelectItem>
							<SelectItem value="Low">Low</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[50px]">#</TableHead>
							<TableHead className="w-[300px]">
								<button
									type="button"
									onClick={() => handleSort("videoTitle")}
									className="flex items-center font-medium hover:text-foreground"
								>
									Video Project
									{renderSortIcon("videoTitle")}
								</button>
							</TableHead>
							<TableHead className="w-[140px]">
								<button
									type="button"
									onClick={() => handleSort("status")}
									className="flex items-center font-medium hover:text-foreground"
								>
									Status
									{renderSortIcon("status")}
								</button>
							</TableHead>
							<TableHead className="w-[140px]">
								<button
									type="button"
									onClick={() => handleSort("assignedTo")}
									className="flex items-center font-medium hover:text-foreground"
								>
									Assigned To
									{renderSortIcon("assignedTo")}
								</button>
							</TableHead>
							<TableHead className="w-[120px]">
								<button
									type="button"
									onClick={() => handleSort("dueDate")}
									className="flex items-center font-medium hover:text-foreground"
								>
									Due Date
									{renderSortIcon("dueDate")}
								</button>
							</TableHead>
							<TableHead className="w-[100px]">
								<button
									type="button"
									onClick={() => handleSort("priority")}
									className="flex items-center font-medium hover:text-foreground"
								>
									Priority
									{renderSortIcon("priority")}
								</button>
							</TableHead>
							<TableHead className="w-[100px]">Comments</TableHead>
							<TableHead className="w-[80px] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedProjects.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} className="h-24 text-center">
									<div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
										<IconSearch className="size-8" />
										<p>No projects found</p>
										{(searchQuery ||
											statusFilter !== "all" ||
											priorityFilter !== "all") && (
											<Button
												variant="link"
												onClick={() => {
													setSearchQuery("");
													setStatusFilter("all");
													setPriorityFilter("all");
													setCurrentPage(1);
												}}
											>
												Clear filters
											</Button>
										)}
									</div>
								</TableCell>
							</TableRow>
						) : (
							paginatedProjects.map((project, index) => (
								<TableRow key={project.id} className="group hover:bg-muted/50">
									{/* Row Number */}
									<TableCell className="font-medium text-muted-foreground">
										{(currentPage - 1) * pageSize + index + 1}
									</TableCell>

									{/* Video Project */}
									<TableCell>
										<div className="flex items-center gap-3">
											<div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
												<img
													src={project.thumbnail}
													alt={project.videoTitle}
													className="size-full object-cover"
												/>
												<div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
													<IconPlayerPlay className="size-6 text-white" />
												</div>
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium">
													{project.videoTitle}
												</p>
												<p className="truncate text-muted-foreground text-sm">
													{project.projectName}
												</p>
												<p className="text-muted-foreground text-xs">
													{project.duration} • {project.resolution}
												</p>
											</div>
										</div>
									</TableCell>

									{/* Status */}
									<TableCell>
										<Badge
											variant={
												getStatusBadgeVariant(project.status) as
													| "default"
													| "secondary"
													| "destructive"
													| "outline"
											}
										>
											{project.status}
										</Badge>
									</TableCell>

									{/* Assigned To */}
									<TableCell>
										<div className="flex items-center gap-2">
											<img
												src={project.assignedToAvatar}
												alt={project.assignedTo}
												className="size-6 rounded-full"
											/>
											<span className="truncate text-sm">
												{project.assignedTo}
											</span>
										</div>
									</TableCell>

									{/* Due Date */}
									<TableCell>
										<div className="flex items-center gap-1 text-sm">
											<IconClock className="size-4 text-muted-foreground" />
											{formatDate(project.dueDate)}
										</div>
									</TableCell>

									{/* Priority */}
									<TableCell>
										<div className="flex items-center gap-1.5">
											<span
												className={`size-2 rounded-full ${PRIORITY_COLOR_MAP[project.priority]}`}
											/>
											<span className="text-sm">{project.priority}</span>
										</div>
									</TableCell>

									{/* Comments */}
									<TableCell>
										<div className="flex items-center gap-1 text-muted-foreground text-sm">
											<IconMessageCircle className="size-4" />
											{project.commentsCount}
										</div>
									</TableCell>

									{/* Actions */}
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<IconDots className="size-4" />
													<span className="sr-only">Actions</span>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuLabel>Actions</DropdownMenuLabel>
												<DropdownMenuItem>
													<IconEye className="mr-2 size-4" />
													View Project
												</DropdownMenuItem>
												<DropdownMenuItem>
													<IconPlayerPlay className="mr-2 size-4" />
													Play Video
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem>
													<IconShare className="mr-2 size-4" />
													Share
												</DropdownMenuItem>
												<DropdownMenuItem>
													<IconDownload className="mr-2 size-4" />
													Download
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					<span>
						Showing {(currentPage - 1) * pageSize + 1} to{" "}
						{Math.min(currentPage * pageSize, sortedProjects.length)} of{" "}
						{sortedProjects.length} projects
					</span>
				</div>

				<div className="flex items-center gap-2">
					<Select
						value={pageSize.toString()}
						onValueChange={(value) => {
							setPageSize(Number(value));
							setCurrentPage(1);
						}}
					>
						<SelectTrigger className="w-[100px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="10">10 / page</SelectItem>
							<SelectItem value="20">20 / page</SelectItem>
							<SelectItem value="50">50 / page</SelectItem>
						</SelectContent>
					</Select>

					<div className="flex gap-1">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
							disabled={currentPage === 1}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setCurrentPage((prev) => Math.min(totalPages, prev + 1))
							}
							disabled={currentPage === totalPages}
						>
							Next
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
