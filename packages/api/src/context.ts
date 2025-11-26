import { auth } from "@koko/auth";
import type { Context as HonoContext } from "hono";
import {
	createChildLogger,
	generateTraceId,
	getLogger,
	type Logger,
} from "./lib/logger";

export type CreateContextOptions = {
	context: HonoContext;
	traceId?: string;
	logger?: Logger;
};

export async function createContext({
	context,
	traceId,
	logger,
}: CreateContextOptions): Promise<{
	session: Awaited<ReturnType<typeof auth.api.getSession>>;
	headers: Headers;
	traceId: string;
	logger: Logger;
}> {
	const headers = context.req.raw.headers;
	const session = await auth.api.getSession({
		headers,
	});

	// Use provided traceId/logger or create new ones (for testing or non-Hono contexts)
	const resolvedTraceId = traceId ?? generateTraceId();
	const baseLogger = logger ?? getLogger();
	const resolvedLogger = traceId
		? baseLogger
		: createChildLogger(baseLogger, { traceId: resolvedTraceId });

	// Add userId to logger context if authenticated
	const contextLogger = session?.user?.id
		? createChildLogger(resolvedLogger, { userId: session.user.id })
		: resolvedLogger;

	return {
		session,
		headers,
		traceId: resolvedTraceId,
		logger: contextLogger,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
