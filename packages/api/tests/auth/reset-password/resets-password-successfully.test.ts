import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockResetPassword, resetAuthMocks } from "../../utils/mocks/auth";
import { createTestCaller } from "../../utils/testCaller";

beforeEach(() => resetAuthMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetAuthMocks();
});

it("resets password successfully with valid token", async () => {
	mockResetPassword(true);

	const caller = createTestCaller();

	const result = await caller.auth.resetPassword({
		token: "valid-reset-token",
		newPassword: "newSecurePassword123",
	});

	expect(result).toEqual({
		success: true,
		message: "Password reset successfully",
	});
});
