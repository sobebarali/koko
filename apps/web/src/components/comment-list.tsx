import { IconLoader2, IconMessageCircle } from "@tabler/icons-react";
import { useState } from "react";
import { CommentForm } from "@/components/comment-form";
import { CommentItem } from "@/components/comment-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ResolvedFilter, useComments } from "@/hooks/use-comments";

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
	const { comments, isLoading, error } = useComments({
		videoId,
		resolved: filter,
	});

	const handleFilterChange = (value: string): void => {
		setFilter(value as ResolvedFilter);
	};

	return (
		<div className="flex h-full flex-col">
			<div className="border-b p-4">
				<h2 className="flex items-center gap-2 font-semibold text-lg">
					<IconMessageCircle className="size-5" />
					Comments
					{!isLoading && (
						<span className="font-normal text-muted-foreground text-sm">
							({comments.length})
						</span>
					)}
				</h2>
			</div>

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

			<div className="border-t p-4">
				<CommentForm videoId={videoId} currentTimecode={currentTimecode} />
			</div>
		</div>
	);
}
