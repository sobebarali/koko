import type { Context } from "../../src/context";

type TestSession = NonNullable<Context["session"]>;

export function createTestSession(overrides?: {
	user?: Partial<{
		id: string;
		email: string;
		name: string;
		emailVerified: boolean;
		image: string | null;
		createdAt: Date;
		updatedAt: Date;
	}>;
}): TestSession {
	const now = new Date();
	const baseUser = {
		id: "user_test",
		email: "user@example.com",
		name: "Test User",
		emailVerified: false,
		image: null,
		createdAt: now,
		updatedAt: now,
	};

	return {
		user: {
			...baseUser,
			...(overrides?.user ?? {}),
		},
	} as TestSession;
}
