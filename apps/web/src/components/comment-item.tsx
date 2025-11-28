import {
	IconCheck,
	IconCheckbox,
	IconCornerDownRight,
	IconDots,
	IconEdit,
	IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
	type CommentReply,
	type CommentWithReplies,
	useDeleteComment,
	useReplyToComment,
	useResolveComment,
	useUnresolveComment,
	useUpdateComment,
} from "@/hooks/use-comments";
import { cn } from "@/lib/utils";

interface CommentItemProps {
	comment: CommentWithReplies;
	currentUserId: string;
	onTimecodeClick?: (timecode: number) => void;
}

function formatTimecode(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function CommentItem({
	comment,
	currentUserId,
	onTimecodeClick,
}: CommentItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(comment.text);
	const [isReplying, setIsReplying] = useState(false);
	const [replyText, setReplyText] = useState("");

	const { updateComment, isUpdating } = useUpdateComment();
	const { deleteComment, isDeleting } = useDeleteComment();
	const { resolveComment, isResolving } = useResolveComment();
	const { unresolveComment, isUnresolving } = useUnresolveComment();
	const { replyToComment, isReplying: isSubmittingReply } = useReplyToComment();

	const isOwner = comment.authorId === currentUserId;

	const handleUpdate = async (): Promise<void> => {
		if (!editText.trim()) return;
		await updateComment({ id: comment.id, text: editText.trim() });
		setIsEditing(false);
	};

	const handleDelete = async (): Promise<void> => {
		if (confirm("Are you sure you want to delete this comment?")) {
			await deleteComment(comment.id);
		}
	};

	const handleResolve = async (): Promise<void> => {
		if (comment.resolved) {
			await unresolveComment({ id: comment.id });
		} else {
			await resolveComment({ id: comment.id, resolved: true });
		}
	};

	const handleReply = async (): Promise<void> => {
		if (!replyText.trim()) return;
		await replyToComment({ parentId: comment.id, text: replyText.trim() });
		setReplyText("");
		setIsReplying(false);
	};

	return (
		<div
			className={cn(
				"rounded-lg border p-4",
				comment.resolved &&
					"border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
			)}
		>
			<div className="flex items-start gap-3">
				<Avatar className="size-8">
					<AvatarImage
						src={
							comment.author.image ||
							`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.name}`
						}
						alt={comment.author.name}
					/>
					<AvatarFallback>{getInitials(comment.author.name)}</AvatarFallback>
				</Avatar>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="font-medium text-sm">{comment.author.name}</span>
						<button
							type="button"
							onClick={() => onTimecodeClick?.(comment.timecode)}
							className="font-mono text-primary text-xs hover:underline"
						>
							{formatTimecode(comment.timecode)}
						</button>
						<span className="text-muted-foreground text-xs">
							{formatRelativeTime(comment.createdAt)}
						</span>
						{comment.edited && (
							<span className="text-muted-foreground text-xs">(edited)</span>
						)}
						{comment.resolved && (
							<Badge
								variant="outline"
								className="border-green-500 text-green-600 text-xs"
							>
								<IconCheck className="mr-1 size-3" />
								Resolved
							</Badge>
						)}
					</div>

					{isEditing ? (
						<div className="mt-2 space-y-2">
							<Textarea
								value={editText}
								onChange={(e) => setEditText(e.target.value)}
								className="min-h-[80px] resize-none"
								placeholder="Edit your comment..."
							/>
							<div className="flex gap-2">
								<Button
									size="sm"
									onClick={handleUpdate}
									disabled={isUpdating || !editText.trim()}
								>
									{isUpdating ? "Saving..." : "Save"}
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										setIsEditing(false);
										setEditText(comment.text);
									}}
								>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<p className="mt-1 text-sm">{comment.text}</p>
					)}

					{!isEditing && (
						<div className="mt-2 flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={() => setIsReplying(!isReplying)}
							>
								<IconCornerDownRight className="mr-1 size-3" />
								Reply
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className={cn(
									"h-7 px-2 text-xs",
									comment.resolved && "text-green-600",
								)}
								onClick={handleResolve}
								disabled={isResolving || isUnresolving}
							>
								<IconCheckbox className="mr-1 size-3" />
								{comment.resolved ? "Reopen" : "Resolve"}
							</Button>
						</div>
					)}

					{isReplying && (
						<div className="mt-3 space-y-2">
							<Textarea
								value={replyText}
								onChange={(e) => setReplyText(e.target.value)}
								className="min-h-[60px] resize-none"
								placeholder="Write a reply..."
								autoFocus
							/>
							<div className="flex gap-2">
								<Button
									size="sm"
									onClick={handleReply}
									disabled={isSubmittingReply || !replyText.trim()}
								>
									{isSubmittingReply ? "Sending..." : "Reply"}
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										setIsReplying(false);
										setReplyText("");
									}}
								>
									Cancel
								</Button>
							</div>
						</div>
					)}

					{comment.replies.length > 0 && (
						<div className="mt-4 space-y-3 border-muted border-l-2 pl-4">
							{comment.replies.map((reply) => (
								<ReplyItem
									key={reply.id}
									reply={reply}
									currentUserId={currentUserId}
								/>
							))}
						</div>
					)}
				</div>

				{isOwner && !isEditing && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="size-8 p-0">
								<IconDots className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setIsEditing(true)}>
								<IconEdit className="mr-2 size-4" />
								Edit
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={handleDelete}
								disabled={isDeleting}
								variant="destructive"
							>
								<IconTrash className="mr-2 size-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</div>
	);
}

interface ReplyItemProps {
	reply: CommentReply;
	currentUserId: string;
}

function ReplyItem({ reply, currentUserId }: ReplyItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(reply.text);

	const { updateComment, isUpdating } = useUpdateComment();
	const { deleteComment, isDeleting } = useDeleteComment();

	const isOwner = reply.authorId === currentUserId;

	const handleUpdate = async (): Promise<void> => {
		if (!editText.trim()) return;
		await updateComment({ id: reply.id, text: editText.trim() });
		setIsEditing(false);
	};

	const handleDelete = async (): Promise<void> => {
		if (confirm("Are you sure you want to delete this reply?")) {
			await deleteComment(reply.id);
		}
	};

	return (
		<div className="flex items-start gap-3">
			<Avatar className="size-6">
				<AvatarImage
					src={
						reply.author.image ||
						`https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.author.name}`
					}
					alt={reply.author.name}
				/>
				<AvatarFallback className="text-xs">
					{getInitials(reply.author.name)}
				</AvatarFallback>
			</Avatar>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="font-medium text-sm">{reply.author.name}</span>
					<span className="text-muted-foreground text-xs">
						{formatRelativeTime(reply.createdAt)}
					</span>
					{reply.edited && (
						<span className="text-muted-foreground text-xs">(edited)</span>
					)}
				</div>

				{isEditing ? (
					<div className="mt-2 space-y-2">
						<Textarea
							value={editText}
							onChange={(e) => setEditText(e.target.value)}
							className="min-h-[60px] resize-none"
							placeholder="Edit your reply..."
						/>
						<div className="flex gap-2">
							<Button
								size="sm"
								onClick={handleUpdate}
								disabled={isUpdating || !editText.trim()}
							>
								{isUpdating ? "Saving..." : "Save"}
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									setIsEditing(false);
									setEditText(reply.text);
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<p className="mt-1 text-sm">{reply.text}</p>
				)}
			</div>

			{isOwner && !isEditing && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="size-6 p-0">
							<IconDots className="size-3" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => setIsEditing(true)}>
							<IconEdit className="mr-2 size-4" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleDelete}
							disabled={isDeleting}
							variant="destructive"
						>
							<IconTrash className="mr-2 size-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
