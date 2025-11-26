import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockVerifyEmail, resetAuthMocks } from "../../utils/mocks/auth";
import { createTestCaller } from "../../utils/testCaller";

beforeEach(() => resetAuthMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetAuthMocks();
});

it("verifies email successfully with valid token", async () => {
	mockVerifyEmail(true);

	const caller = createTestCaller();

	const result = await caller.auth.verifyEmail({ token: "valid-token" });

	expect(result).toEqual({
		success: true,
		message: "Email verified successfully",
	});
});
