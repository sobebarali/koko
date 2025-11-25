import type { Context } from "../../src/context";
import { createSilentLogger, generateTraceId } from "../../src/lib/logger";
import { appRouter } from "../../src/routers";

// Create a silent logger for tests to avoid log noise
const testLogger = createSilentLogger();

const baseContext: Context = {
	session: null,
	traceId: generateTraceId(),
	logger: testLogger,
};

export function createTestCaller(overrides?: Partial<Context>) {
	const traceId = overrides?.traceId ?? generateTraceId();
	return appRouter.createCaller({
		...baseContext,
		...overrides,
		traceId,
		logger: testLogger.child({ traceId }),
	});
}
