import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetAuthMocks } from "../../utils/mocks/auth";
import { createTestCaller } from "../../utils/testCaller";

beforeEach(() => resetAuthMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetAuthMocks();
});

it("rejects password shorter than 8 characters", async () => {
	const caller = createTestCaller();

	await expect(
		caller.auth.resetPassword({
			token: "valid-token",
			newPassword: "short",
		}),
	).rejects.toThrow();
});

it("rejects password longer than 72 characters", async () => {
	const caller = createTestCaller();

	const longPassword = "a".repeat(73);

	await expect(
		caller.auth.resetPassword({
			token: "valid-token",
			newPassword: longPassword,
		}),
	).rejects.toThrow();
});
