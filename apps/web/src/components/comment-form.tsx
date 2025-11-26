import { IconSend } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateComment } from "@/hooks/use-comments";

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

	const { createComment, isCreating } = useCreateComment();

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

	const handleSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();
		if (!text.trim()) return;

		const timecode = parseTimecode(timecodeInput);
		await createComment({
			videoId,
			text: text.trim(),
			timecode,
		});

		setText("");
		setIsManualEdit(false);
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
			<Textarea
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="Add a comment at this timecode..."
				className="min-h-[80px] resize-none"
			/>
			<div className="flex justify-end">
				<Button type="submit" disabled={isCreating || !text.trim()} size="sm">
					<IconSend className="mr-2 size-4" />
					{isCreating ? "Posting..." : "Post Comment"}
				</Button>
			</div>
		</form>
	);
}
