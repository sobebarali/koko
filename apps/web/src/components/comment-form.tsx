import { IconSend } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateComment } from "@/hooks/use-comments";
import { type MentionableUser, useMentionableUsers } from "@/hooks/use-videos";
import { cn } from "@/lib/utils";

interface CommentFormProps {
	videoId: string;
	currentTimecode?: number;
}

function parseTimecode(value: string): number {
	const parts = value.split(":").map(Number);
	if (parts.length === 2) {
		const [mins, secs] = parts;
		if (!Number.isNaN(mins) && !Number.isNaN(secs)) {
			return mins * 60 + secs;
		}
	}
	return 0;
}

function formatTimecodeInput(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function extractMentionUserIds({
	text,
	users,
}: {
	text: string;
	users: MentionableUser[];
}): string[] {
	const mentionPattern = /@(\w+(?:\s+\w+)?)/g;
	const mentions: string[] = [];
	const matches = text.matchAll(mentionPattern);

	for (const match of matches) {
		const mentionedName = match[1]?.toLowerCase();
		const user = users.find((u) => u.name.toLowerCase() === mentionedName);
		if (user) {
			mentions.push(user.id);
		}
	}

	return [...new Set(mentions)];
}

export function CommentForm({
	videoId,
	currentTimecode = 0,
}: CommentFormProps) {
	const [text, setText] = useState("");
	const [timecodeInput, setTimecodeInput] = useState(
		formatTimecodeInput(currentTimecode),
	);
	const [isManualEdit, setIsManualEdit] = useState(false);
	const manualEditTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Mention state
	const [showMentions, setShowMentions] = useState(false);
	const [mentionQuery, setMentionQuery] = useState("");
	const [mentionIndex, setMentionIndex] = useState(0);
	const [cursorPosition, setCursorPosition] = useState(0);

	const { createComment, isCreating } = useCreateComment();
	const { users: mentionableUsers } = useMentionableUsers({ videoId });

	// Filter users based on mention query
	const filteredUsers = mentionableUsers.filter((user) =>
		user.name.toLowerCase().includes(mentionQuery.toLowerCase()),
	);

	// Sync timecode input with video playback (unless user is manually editing)
	useEffect(() => {
		if (!isManualEdit) {
			setTimecodeInput(formatTimecodeInput(currentTimecode));
		}
	}, [currentTimecode, isManualEdit]);

	const handleTimecodeChange = (value: string): void => {
		setTimecodeInput(value);
		setIsManualEdit(true);

		// Reset manual edit mode after 3 seconds of no changes
		if (manualEditTimeoutRef.current) {
			clearTimeout(manualEditTimeoutRef.current);
		}
		manualEditTimeoutRef.current = setTimeout(() => {
			setIsManualEdit(false);
		}, 3000);
	};

	const insertMention = useCallback(
		(user: MentionableUser): void => {
			// Find the @ symbol position
			const beforeCursor = text.slice(0, cursorPosition);
			const atIndex = beforeCursor.lastIndexOf("@");

			if (atIndex !== -1) {
				const before = text.slice(0, atIndex);
				const after = text.slice(cursorPosition);
				const newText = `${before}@${user.name} ${after}`;
				setText(newText);

				// Move cursor after the inserted mention
				const newCursorPos = atIndex + user.name.length + 2;
				setTimeout(() => {
					if (textareaRef.current) {
						textareaRef.current.selectionStart = newCursorPos;
						textareaRef.current.selectionEnd = newCursorPos;
						textareaRef.current.focus();
					}
				}, 0);
			}

			setShowMentions(false);
			setMentionQuery("");
			setMentionIndex(0);
		},
		[text, cursorPosition],
	);

	const handleTextChange = (
		e: React.ChangeEvent<HTMLTextAreaElement>,
	): void => {
		const newText = e.target.value;
		const newCursorPos = e.target.selectionStart;
		setText(newText);
		setCursorPosition(newCursorPos);

		// Check if we should show mentions dropdown
		const beforeCursor = newText.slice(0, newCursorPos);
		const atMatch = beforeCursor.match(/@(\w*)$/);

		if (atMatch) {
			setShowMentions(true);
			setMentionQuery(atMatch[1] || "");
			setMentionIndex(0);
		} else {
			setShowMentions(false);
			setMentionQuery("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
		if (!showMentions || filteredUsers.length === 0) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setMentionIndex((prev) => (prev + 1) % filteredUsers.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setMentionIndex(
				(prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length,
			);
		} else if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			const selectedUser = filteredUsers[mentionIndex];
			if (selectedUser) {
				insertMention(selectedUser);
			}
		} else if (e.key === "Escape") {
			setShowMentions(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();
		if (!text.trim()) return;

		const timecode = parseTimecode(timecodeInput);
		const mentions = extractMentionUserIds({ text, users: mentionableUsers });

		await createComment({
			videoId,
			text: text.trim(),
			timecode,
			mentions,
		});

		setText("");
		setIsManualEdit(false);
		setShowMentions(false);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-3">
			<div className="flex items-center gap-2">
				<label htmlFor="timecode" className="text-muted-foreground text-sm">
					Timecode:
				</label>
				<Input
					id="timecode"
					type="text"
					value={timecodeInput}
					onChange={(e) => handleTimecodeChange(e.target.value)}
					onFocus={() => setIsManualEdit(true)}
					placeholder="0:00"
					className="w-20 font-mono text-sm"
				/>
				{isManualEdit && (
					<span className="text-muted-foreground text-xs">(editing)</span>
				)}
			</div>
			<div className="relative">
				<Textarea
					ref={textareaRef}
					value={text}
					onChange={handleTextChange}
					onKeyDown={handleKeyDown}
					placeholder="Add a comment at this timecode... Use @ to mention someone"
					className="min-h-[80px] resize-none"
				/>
				{showMentions && filteredUsers.length > 0 && (
					<div className="absolute bottom-full left-0 z-10 mb-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
						{filteredUsers.map((user, index) => (
							<button
								key={user.id}
								type="button"
								onClick={() => insertMention(user)}
								className={cn(
									"flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
									index === mentionIndex
										? "bg-accent text-accent-foreground"
										: "hover:bg-accent hover:text-accent-foreground",
								)}
							>
								<Avatar className="size-6">
									<AvatarImage
										src={
											user.image ||
											`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
										}
										alt={user.name}
									/>
									<AvatarFallback className="text-xs">
										{getInitials(user.name)}
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col">
									<span className="font-medium">{user.name}</span>
									<span className="text-muted-foreground text-xs">
										{user.email}
									</span>
								</div>
							</button>
						))}
					</div>
				)}
			</div>
			<div className="flex justify-end">
				<Button type="submit" disabled={isCreating || !text.trim()} size="sm">
					<IconSend className="mr-2 size-4" />
					{isCreating ? "Posting..." : "Post Comment"}
				</Button>
			</div>
		</form>
	);
}
