import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { sanitizeInput } from "./lib/logger";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

// Logging middleware for all procedures
const loggingMiddleware = t.middleware(
	async ({ ctx, path, type, input, next }) => {
		const startTime = Date.now();
		const { logger, traceId } = ctx;

		// Log procedure start with sanitized input
		logger.info(
			{
				event: "procedure_start",
				procedure: path,
				type,
				input: sanitizeInput(input),
				traceId,
			},
			`${type}: ${path}`,
		);

		try {
			const result = await next();
			const duration = Date.now() - startTime;

			// Log procedure success
			logger.info(
				{
					event: "procedure_end",
					procedure: path,
					type,
					duration,
					traceId,
				},
				`${type}: ${path} completed in ${duration}ms`,
			);

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;

			// Log procedure error
			logger.error(
				{
					event: "procedure_error",
					procedure: path,
					type,
					duration,
					traceId,
					input: sanitizeInput(input),
					error:
						error instanceof TRPCError
							? {
									code: error.code,
									message: error.message,
									cause: error.cause,
								}
							: error instanceof Error
								? {
										name: error.name,
										message: error.message,
										stack: error.stack,
									}
								: error,
				},
				`${type}: ${path} failed - ${error instanceof Error ? error.message : "Unknown error"}`,
			);

			throw error;
		}
	},
);

// Base procedure with logging
const baseProcedure = t.procedure.use(loggingMiddleware);

export const publicProcedure = baseProcedure;

export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
			cause: "No session",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});
