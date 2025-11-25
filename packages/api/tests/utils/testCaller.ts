import type { Context } from "../../src/context";
import { appRouter } from "../../src/routers";

const baseContext: Context = {
	session: null,
};

export function createTestCaller(overrides?: Partial<Context>) {
	return appRouter.createCaller({
		...baseContext,
		...overrides,
	});
}
