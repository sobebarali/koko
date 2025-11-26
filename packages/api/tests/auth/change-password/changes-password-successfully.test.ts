import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockChangePassword, resetAuthMocks } from "../../utils/mocks/auth";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetAuthMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetAuthMocks();
});

it("changes password successfully with correct current password", async () => {
	mockChangePassword(true);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.auth.changePassword({
		currentPassword: "oldPassword123",
		newPassword: "newSecurePassword456",
	});

	expect(result).toEqual({
		success: true,
		message: "Password changed successfully",
	});
});
