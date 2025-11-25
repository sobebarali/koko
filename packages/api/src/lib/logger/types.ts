import type { Logger as PinoLogger } from "pino";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

// Base context that can be extended
export interface LogContext {
	traceId?: string;
	userId?: string;
	[key: string]: unknown;
}

// Full context with required traceId (for root contexts)
export interface RootLogContext extends LogContext {
	traceId: string;
}

export interface RequestLogContext extends RootLogContext {
	method: string;
	path: string;
	userAgent?: string;
	ip?: string;
}

export interface ProcedureLogContext extends RootLogContext {
	procedure: string;
	type: "query" | "mutation" | "subscription";
	input?: unknown;
}

export type Logger = PinoLogger;

export interface CreateLoggerOptions {
	level?: LogLevel;
	pretty?: boolean;
	redact?: string[];
}
