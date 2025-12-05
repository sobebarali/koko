// Domain configuration for multi-domain routing
// www.usekoko.com → Landing page
// app.usekoko.com → Application (post-login)

const DOMAINS = {
	landing: import.meta.env.VITE_LANDING_DOMAIN || "localhost:3001",
	app: import.meta.env.VITE_APP_DOMAIN || "localhost:3001",
} as const;

export type DomainType = "landing" | "app" | "local";

export function getDomainType(): DomainType {
	const hostname = window.location.hostname;

	if (hostname === DOMAINS.landing) return "landing";
	if (hostname === DOMAINS.app) return "app";
	return "local"; // localhost for development
}

export function isLandingDomain(): boolean {
	return getDomainType() === "landing";
}

export function isAppDomain(): boolean {
	return getDomainType() === "app";
}

export function isLocalDomain(): boolean {
	return getDomainType() === "local";
}

export function getAppUrl({ path = "/" }: { path?: string }): string {
	return `https://${DOMAINS.app}${path}`;
}

export function getLandingUrl({ path = "/" }: { path?: string }): string {
	return `https://${DOMAINS.landing}${path}`;
}

// Routes that belong to each domain
export const LANDING_ROUTES = ["/", "/login", "/auth"] as const;
export const APP_ROUTES = [
	"/dashboard",
	"/projects",
	"/settings",
	"/success",
] as const;

export function isLandingRoute({ pathname }: { pathname: string }): boolean {
	return LANDING_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
}

export function isAppRoute({ pathname }: { pathname: string }): boolean {
	return APP_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
}
