import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useUploadAvatar } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface AvatarUploadProps {
	currentImage: string | null;
	userName: string;
	onUploadComplete?: (newImageUrl: string) => void;
}

export function AvatarUpload({
	currentImage,
	userName,
	onUploadComplete,
}: AvatarUploadProps): React.ReactElement {
	const [preview, setPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { uploadAvatar, isUploading } = useUploadAvatar();

	const getInitials = (name: string): string => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const handleFileSelect = async (
		event: React.ChangeEvent<HTMLInputElement>,
	): Promise<void> => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!ALLOWED_TYPES.includes(file.type)) {
			return;
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			return;
		}

		// Show preview
		const reader = new FileReader();
		reader.onload = (e) => setPreview(e.target?.result as string);
		reader.readAsDataURL(file);

		// Upload the file
		const avatarUrl = await uploadAvatar(file);
		if (avatarUrl && onUploadComplete) {
			onUploadComplete(avatarUrl);
		}
	};

	const handleClick = (): void => {
		fileInputRef.current?.click();
	};

	const displayImage = preview || currentImage;
	const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`;

	return (
		<div className="flex flex-col items-center gap-4">
			<div className="relative">
				<Avatar className="h-24 w-24">
					<AvatarImage src={displayImage || fallbackUrl} alt={userName} />
					<AvatarFallback className="text-lg">
						{getInitials(userName)}
					</AvatarFallback>
				</Avatar>

				{isUploading && (
					<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
						<Loader2 className="h-6 w-6 animate-spin text-white" />
					</div>
				)}
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept={ALLOWED_TYPES.join(",")}
				onChange={handleFileSelect}
				className="hidden"
				disabled={isUploading}
			/>

			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={handleClick}
				disabled={isUploading}
			>
				<Camera className="mr-2 h-4 w-4" />
				{isUploading ? "Uploading..." : "Change Avatar"}
			</Button>

			<p className="text-center text-muted-foreground text-xs">
				JPEG, PNG, WebP, or GIF. Max 5MB.
			</p>
		</div>
	);
}
