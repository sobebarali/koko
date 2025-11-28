import {
	IconLoader2,
	IconMessageCircle,
	IconSearch,
	IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { CommentForm } from "@/components/comment-form";
import { CommentItem } from "@/components/comment-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type ResolvedFilter,
	type SearchCommentResult,
	useComments,
	useSearchComments,
} from "@/hooks/use-comments";

interface CommentListProps {
	videoId: string;
	currentUserId: string;
	currentTimecode?: number;
	onTimecodeClick?: (timecode: number) => void;
}

export function CommentList({
	videoId,
	currentUserId,
	currentTimecode = 0,
	onTimecodeClick,
}: CommentListProps) {
	const [filter, setFilter] = useState<ResolvedFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchMode, setIsSearchMode] = useState(false);

	const { comments, isLoading, error } = useComments({
		videoId,
		resolved: filter,
	});

	const {
		comments: searchResults,
		isSearching,
		error: searchError,
	} = useSearchComments({
		videoId,
		searchText: searchQuery,
		enabled: isSearchMode && searchQuery.length > 0,
	});

	const handleFilterChange = (value: string): void => {
		setFilter(value as ResolvedFilter);
	};

	const handleSearchToggle = (): void => {
		setIsSearchMode(!isSearchMode);
		if (isSearchMode) {
			setSearchQuery("");
		}
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setSearchQuery(e.target.value);
	};

	const handleClearSearch = (): void => {
		setSearchQuery("");
	};

	const displayedComments =
		isSearchMode && searchQuery.length > 0 ? searchResults : comments;
	const isLoadingData =
		isSearchMode && searchQuery.length > 0 ? isSearching : isLoading;

	// Convert search results to CommentWithReplies format for display
	const commentsToDisplay =
		isSearchMode && searchQuery.length > 0
			? searchResults.map((c: SearchCommentResult) => ({
					...c,
					replies: [],
				}))
			: comments;

	return (
		<div className="flex h-full flex-col">
			<div className="border-b p-4">
				<div className="flex items-center justify-between">
					<h2 className="flex items-center gap-2 font-semibold text-lg">
						<IconMessageCircle className="size-5" />
						Comments
						{!isLoadingData && (
							<span className="font-normal text-muted-foreground text-sm">
								({displayedComments.length})
							</span>
						)}
					</h2>
					<Button
						variant={isSearchMode ? "secondary" : "ghost"}
						size="sm"
						onClick={handleSearchToggle}
						className="size-8 p-0"
					>
						<IconSearch className="size-4" />
					</Button>
				</div>
				{isSearchMode && (
					<div className="relative mt-3">
						<IconSearch className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search comments..."
							value={searchQuery}
							onChange={handleSearchChange}
							className="pr-9 pl-9"
							autoFocus
						/>
						{searchQuery && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleClearSearch}
								className="-translate-y-1/2 absolute top-1/2 right-1 size-7 p-0"
							>
								<IconX className="size-4" />
							</Button>
						)}
					</div>
				)}
			</div>

			{!isSearchMode && (
				<Tabs
					value={filter}
					onValueChange={handleFilterChange}
					className="flex flex-1 flex-col"
				>
					<div className="border-b px-4 pt-2">
						<TabsList className="h-9">
							<TabsTrigger value="all" className="text-xs">
								All
							</TabsTrigger>
							<TabsTrigger value="unresolved" className="text-xs">
								Open
							</TabsTrigger>
							<TabsTrigger value="resolved" className="text-xs">
								Resolved
							</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent value={filter} className="mt-0 flex-1 overflow-auto p-4">
						{isLoading ? (
							<div className="flex items-center justify-center py-8">
								<IconLoader2 className="size-6 animate-spin text-muted-foreground" />
							</div>
						) : error ? (
							<div className="py-8 text-center text-destructive text-sm">
								Failed to load comments
							</div>
						) : comments.length === 0 ? (
							<div className="py-8 text-center text-muted-foreground text-sm">
								{filter === "all"
									? "No comments yet. Be the first to comment!"
									: filter === "resolved"
										? "No resolved comments"
										: "No open comments"}
							</div>
						) : (
							<div className="space-y-4">
								{comments.map((comment) => (
									<CommentItem
										key={comment.id}
										comment={comment}
										currentUserId={currentUserId}
										onTimecodeClick={onTimecodeClick}
									/>
								))}
							</div>
						)}
					</TabsContent>
				</Tabs>
			)}

			{isSearchMode && (
				<div className="flex-1 overflow-auto p-4">
					{isSearching ? (
						<div className="flex items-center justify-center py-8">
							<IconLoader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : searchError ? (
						<div className="py-8 text-center text-destructive text-sm">
							Failed to search comments
						</div>
					) : searchQuery.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground text-sm">
							Enter a search term to find comments
						</div>
					) : commentsToDisplay.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground text-sm">
							No comments found for &quot;{searchQuery}&quot;
						</div>
					) : (
						<div className="space-y-4">
							{commentsToDisplay.map((comment) => (
								<CommentItem
									key={comment.id}
									comment={comment}
									currentUserId={currentUserId}
									onTimecodeClick={onTimecodeClick}
								/>
							))}
						</div>
					)}
				</div>
			)}

			<div className="border-t p-4">
				<CommentForm videoId={videoId} currentTimecode={currentTimecode} />
			</div>
		</div>
	);
}
