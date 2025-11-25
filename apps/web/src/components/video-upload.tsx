import { IconCheck, IconLoader2, IconUpload, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as tus from "tus-js-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useCreateUpload } from "@/hooks/use-videos";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
	projectId: string;
	onSuccess?: (videoId: string) => void;
	onCancel?: () => void;
}

type UploadState = "idle" | "preparing" | "uploading" | "complete" | "error";

export function VideoUpload({
	projectId,
	onSuccess,
	onCancel,
}: VideoUploadProps) {
	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState("");
	const [uploadState, setUploadState] = useState<UploadState>("idle");
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	const uploadRef = useRef<tus.Upload | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { createUpload, isCreating } = useCreateUpload();

	const validateFile = (file: File): string | null => {
		if (!file.type.startsWith("video/")) {
			return "Please select a video file";
		}
		const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
		if (file.size > maxSize) {
			return "File size must be less than 10GB";
		}
		return null;
	};

	const handleFileSelect = (selectedFile: File) => {
		const validationError = validateFile(selectedFile);
		if (validationError) {
			setError(validationError);
			return;
		}
		setFile(selectedFile);
		setError(null);
		if (!title) {
			setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile) {
			handleFileSelect(droppedFile);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			handleFileSelect(selectedFile);
		}
	};

	const handleUpload = async () => {
		if (!file || !title.trim()) {
			setError("Please select a file and enter a title");
			return;
		}

		setUploadState("preparing");
		setError(null);

		try {
			const credentials = await createUpload({
				projectId,
				title: title.trim(),
				fileName: file.name,
				fileSize: file.size,
				mimeType: file.type,
			});

			setUploadState("uploading");

			const upload = new tus.Upload(file, {
				endpoint: credentials.upload.endpoint,
				headers: {
					AuthorizationSignature:
						credentials.upload.headers.AuthorizationSignature,
					AuthorizationExpire: String(
						credentials.upload.headers.AuthorizationExpire,
					),
					VideoId: credentials.upload.headers.VideoId,
					LibraryId: credentials.upload.headers.LibraryId,
				},
				metadata: {
					filename: file.name,
					filetype: file.type,
					title: title.trim(),
				},
				uploadSize: file.size,
				onError: (err) => {
					console.error("Upload error:", err);
					setUploadState("error");
					setError(err.message || "Upload failed");
					toast.error("Upload failed");
				},
				onProgress: (bytesUploaded, bytesTotal) => {
					const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
					setProgress(percentage);
				},
				onSuccess: () => {
					setUploadState("complete");
					setProgress(100);
					toast.success("Video uploaded successfully");
					onSuccess?.(credentials.video.id);
				},
			});

			uploadRef.current = upload;
			upload.start();
		} catch (err) {
			setUploadState("error");
			setError(
				err instanceof Error ? err.message : "Failed to initialize upload",
			);
		}
	};

	const handleCancel = () => {
		if (uploadRef.current) {
			uploadRef.current.abort();
		}
		setUploadState("idle");
		setProgress(0);
		onCancel?.();
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024)
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	};

	return (
		<div className="space-y-4">
			{uploadState === "idle" && (
				<>
					<button
						type="button"
						className={cn(
							"flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
							isDragging
								? "border-primary bg-primary/5"
								: "border-muted-foreground/25 hover:border-primary/50",
							error && "border-destructive",
						)}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						onClick={() => fileInputRef.current?.click()}
					>
						<input
							ref={fileInputRef}
							type="file"
							accept="video/*"
							onChange={handleInputChange}
							className="hidden"
						/>
						<IconUpload className="mb-4 size-12 text-muted-foreground" />
						<p className="mb-1 font-medium">
							{file ? file.name : "Drop your video here"}
						</p>
						<p className="text-muted-foreground text-sm">
							{file
								? formatFileSize(file.size)
								: "or click to browse (max 10GB)"}
						</p>
					</button>

					{file && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="title">Video Title</Label>
								<Input
									id="title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="Enter video title"
								/>
							</div>
						</div>
					)}

					{error && <p className="text-destructive text-sm">{error}</p>}

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={onCancel}>
							Cancel
						</Button>
						<Button
							onClick={handleUpload}
							disabled={!file || !title.trim() || isCreating}
						>
							{isCreating && (
								<IconLoader2 className="mr-2 size-4 animate-spin" />
							)}
							Upload Video
						</Button>
					</div>
				</>
			)}

			{(uploadState === "preparing" || uploadState === "uploading") && (
				<div className="space-y-4">
					<div className="flex items-center gap-3">
						<IconLoader2 className="size-5 animate-spin text-primary" />
						<div className="flex-1">
							<p className="font-medium">
								{uploadState === "preparing"
									? "Preparing upload..."
									: `Uploading ${file?.name}`}
							</p>
							{uploadState === "uploading" && (
								<p className="text-muted-foreground text-sm">
									{progress}% complete
								</p>
							)}
						</div>
					</div>

					{uploadState === "uploading" && (
						<Progress value={progress} className="h-2" />
					)}

					<div className="flex justify-end">
						<Button variant="outline" onClick={handleCancel}>
							<IconX className="mr-2 size-4" />
							Cancel
						</Button>
					</div>
				</div>
			)}

			{uploadState === "complete" && (
				<div className="space-y-4">
					<div className="flex items-center gap-3 text-green-600">
						<IconCheck className="size-5" />
						<div>
							<p className="font-medium">Upload complete!</p>
							<p className="text-muted-foreground text-sm">
								Your video is now being processed
							</p>
						</div>
					</div>
				</div>
			)}

			{uploadState === "error" && (
				<div className="space-y-4">
					<div className="flex items-center gap-3 text-destructive">
						<IconX className="size-5" />
						<div>
							<p className="font-medium">Upload failed</p>
							<p className="text-muted-foreground text-sm">{error}</p>
						</div>
					</div>

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={onCancel}>
							Cancel
						</Button>
						<Button onClick={() => setUploadState("idle")}>Try Again</Button>
					</div>
				</div>
			)}
		</div>
	);
}
