import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
	getAppUrl,
	getDomainType,
	getLandingUrl,
	isAppRoute,
	isLandingRoute,
} from "@/lib/domain";
import type { trpc } from "@/utils/trpc";
import "../index.css";

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "Koko - Video Collaboration Platform",
			},
			{
				name: "description",
				content:
					"Review, collaborate, and manage video projects with real-time feedback. The modern platform for creative teams.",
			},
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg",
			},
		],
	}),
});

function RootComponent(): React.ReactElement {
	const router = useRouterState();
	const pathname = router.location.pathname;

	// Handle cross-domain redirects
	useEffect(() => {
		const domainType = getDomainType();

		// Skip redirects in local development
		if (domainType === "local") return;

		const onLandingRoute = isLandingRoute({ pathname });
		const onAppRoute = isAppRoute({ pathname });

		// On landing domain but accessing app route → redirect to app domain
		if (domainType === "landing" && onAppRoute) {
			window.location.href = getAppUrl({ path: pathname });
			return;
		}

		// On app domain but accessing landing route → redirect to landing domain
		if (domainType === "app" && onLandingRoute) {
			window.location.href = getLandingUrl({ path: pathname });
		}
	}, [pathname]);

	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<div className="flex min-h-svh flex-col">
					<Header />
					<main className="flex-1">
						<Outlet />
					</main>
				</div>
				<Toaster richColors />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
