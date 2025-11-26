import { IconSend } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateComment } from "@/hooks/use-comments";

interface CommentFormProps {
	videoId: string;
	currentTimecode?: number;
	onTimecodeChange?: (timecode: number) => void;
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
	onTimecodeChange,
}: CommentFormProps) {
	const [text, setText] = useState("");
	const [timecodeInput, setTimecodeInput] = useState(
		formatTimecodeInput(currentTimecode),
	);

	const { createComment, isCreating } = useCreateComment();

	const handleTimecodeChange = (value: string): void => {
		setTimecodeInput(value);
		const seconds = parseTimecode(value);
		onTimecodeChange?.(seconds);
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
					placeholder="0:00"
					className="w-20 font-mono text-sm"
				/>
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
