import type { Context } from "../../src/context";

type TestSession = NonNullable<Context["session"]>;

export function createTestSession(
	overrides?: Partial<TestSession>,
): TestSession {
	const baseSession = {
		user: {
			id: "user_test",
			email: "user@example.com",
		},
	} as TestSession;

	return {
		...baseSession,
		...overrides,
		user: {
			...baseSession.user,
			...(overrides?.user ?? {}),
		},
	};
}
