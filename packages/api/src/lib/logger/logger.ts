import pino from "pino";
import { REDACT_PATHS } from "./sensitive";
import type { CreateLoggerOptions, LogContext, Logger } from "./types";

const isDevelopment = process.env.NODE_ENV !== "production";

export function createLogger(options: CreateLoggerOptions = {}): Logger {
	const {
		level = isDevelopment ? "debug" : "info",
		pretty = isDevelopment,
		redact = REDACT_PATHS,
	} = options;

	const transport = pretty
		? {
				target: "pino-pretty",
				options: {
					colorize: true,
					translateTime: "SYS:standard",
					ignore: "pid,hostname",
				},
			}
		: undefined;

	return pino({
		level,
		transport,
		redact: {
			paths: redact,
			censor: "[REDACTED]",
		},
		formatters: {
			level: (label) => ({ level: label }),
		},
		timestamp: pino.stdTimeFunctions.isoTime,
		base: {
			service: "koko-api",
			env: process.env.NODE_ENV || "development",
		},
	});
}

// Create child logger with trace context
export function createChildLogger(parent: Logger, context: LogContext): Logger {
	return parent.child(context);
}

// Generate trace ID
export function generateTraceId(): string {
	return crypto.randomUUID();
}

// Singleton logger instance
let _logger: Logger | null = null;

export function getLogger(): Logger {
	if (!_logger) {
		_logger = createLogger();
	}
	return _logger;
}

// Create a silent logger for testing
export function createSilentLogger(): Logger {
	return pino({ level: "silent" });
}
