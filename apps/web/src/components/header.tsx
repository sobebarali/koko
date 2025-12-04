import { Link, useRouterState } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import UserMenu from "./user-menu";

export default function Header(): React.ReactElement | null {
	const router = useRouterState();
	const pathname = router.location.pathname;

	// Routes with their own header/layout - don't show global header
	const routesWithOwnLayout = ["/dashboard", "/projects", "/settings"];
	const hasOwnLayout = routesWithOwnLayout.some((route) =>
		pathname.startsWith(route),
	);

	if (hasOwnLayout) {
		return null;
	}

	if (pathname === "/") {
		return <LandingHeader />;
	}

	return <AppHeader />;
}

function LandingHeader(): React.ReactElement {
	const { data: session, isPending } = authClient.useSession();

	return (
		<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
			<div className="container mx-auto flex items-center justify-between px-4 py-3">
				{/* Logo */}
				<Link to="/" className="flex items-center gap-2">
					<Video className="size-6 text-primary" />
					<span className="font-bold text-xl">Koko</span>
				</Link>

				{/* Navigation */}
				<nav className="hidden items-center gap-6 md:flex">
					<a
						href="#features"
						className="text-muted-foreground text-sm transition-colors hover:text-foreground"
					>
						Features
					</a>
					<a
						href="#pricing"
						className="text-muted-foreground text-sm transition-colors hover:text-foreground"
					>
						Pricing
					</a>
				</nav>

				{/* Actions */}
				<div className="flex items-center gap-3">
					<ModeToggle />
					{isPending ? null : session ? (
						<Button size="sm" asChild>
							<Link to="/dashboard">Dashboard</Link>
						</Button>
					) : (
						<>
							<Button
								variant="ghost"
								size="sm"
								asChild
								className="hidden sm:flex"
							>
								<Link to="/login">Sign In</Link>
							</Button>
							<Button size="sm" asChild>
								<Link to="/login">Get Started</Link>
							</Button>
						</>
					)}
				</div>
			</div>
		</header>
	);
}

function AppHeader(): React.ReactElement {
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} to={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
