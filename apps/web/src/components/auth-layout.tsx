import { Video } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

interface AuthLayoutProps {
	children: ReactNode;
	imageSrc: string;
	imageAlt: string;
	tagline?: string;
}

export function AuthLayout({
	children,
	imageSrc,
	imageAlt,
	tagline,
}: AuthLayoutProps): ReactElement {
	return (
		<div className="flex min-h-screen">
			{/* Image Side - Hidden on mobile */}
			<div className="relative hidden lg:flex lg:w-1/2 lg:flex-col">
				<div className="absolute inset-0">
					<img
						src={imageSrc}
						alt={imageAlt}
						className="size-full object-cover"
						loading="eager"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
				</div>

				{/* Branding Overlay */}
				<div className="relative z-10 mt-auto p-8 text-white">
					<div className="flex items-center gap-2">
						<Video className="size-8" />
						<span className="font-bold text-2xl">Koko</span>
					</div>
					{tagline && (
						<p className="mt-4 max-w-md text-lg text-white/80">{tagline}</p>
					)}
				</div>
			</div>

			{/* Form Side */}
			<div className="flex w-full flex-col items-center justify-center bg-background px-4 py-12 lg:w-1/2">
				<div className="w-full max-w-md">{children}</div>
			</div>
		</div>
	);
}
