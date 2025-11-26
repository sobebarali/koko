import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	mockRequestPasswordReset,
	resetAuthMocks,
} from "../../utils/mocks/auth";
import { createTestCaller } from "../../utils/testCaller";

beforeEach(() => resetAuthMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetAuthMocks();
});

it("sends password reset email for existing user", async () => {
	mockRequestPasswordReset(true);

	const caller = createTestCaller();

	const result = await caller.auth.requestPasswordReset({
		email: "user@example.com",
	});

	expect(result).toEqual({
		success: true,
		message:
			"If an account exists with this email, a password reset link has been sent",
	});
});
