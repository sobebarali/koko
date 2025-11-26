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

it("returns success even for non-existent email (prevents user enumeration)", async () => {
	// Simulate user not found - the API would throw but we catch it
	mockRequestPasswordReset(false);

	const caller = createTestCaller();

	// Should still return success to prevent user enumeration
	const result = await caller.auth.requestPasswordReset({
		email: "nonexistent@example.com",
	});

	expect(result).toEqual({
		success: true,
		message:
			"If an account exists with this email, a password reset link has been sent",
	});
});
