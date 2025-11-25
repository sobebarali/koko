import type { Context, MiddlewareHandler, Next } from "hono";
import { createChildLogger, generateTraceId, getLogger } from "./logger";
import type { Logger, RequestLogContext } from "./types";

// Extend Hono context variables
declare module "hono" {
	interface ContextVariableMap {
		traceId: string;
		logger: Logger;
		requestStartTime: number;
	}
}

export function requestLoggingMiddleware(): MiddlewareHandler {
	const rootLogger = getLogger();

	return async (c: Context, next: Next) => {
		const traceId = generateTraceId();
		const startTime = Date.now();

		// Create child logger with trace context
		const logger = createChildLogger(rootLogger, { traceId });

		// Set context variables for downstream use
		c.set("traceId", traceId);
		c.set("logger", logger);
		c.set("requestStartTime", startTime);

		const requestContext: RequestLogContext = {
			traceId,
			method: c.req.method,
			path: c.req.path,
			userAgent: c.req.header("user-agent"),
			ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
		};

		// Log request start
		logger.info(
			{ ...requestContext, event: "request_start" },
			`${c.req.method} ${c.req.path}`,
		);

		try {
			await next();

			// Log request end
			const duration = Date.now() - startTime;
			logger.info(
				{
					...requestContext,
					event: "request_end",
					status: c.res.status,
					duration,
				},
				`${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`,
			);
		} catch (error) {
			const duration = Date.now() - startTime;
			logger.error(
				{
					...requestContext,
					event: "request_error",
					duration,
					error:
						error instanceof Error
							? {
									name: error.name,
									message: error.message,
									stack: error.stack,
								}
							: error,
				},
				`${c.req.method} ${c.req.path} failed - ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			throw error;
		}
	};
}
