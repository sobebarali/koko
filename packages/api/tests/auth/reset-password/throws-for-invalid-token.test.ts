import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockResetPassword, resetAuthMocks } from "../../utils/mocks/auth";
import { createTestCaller } from "../../utils/testCaller";

beforeEach(() => resetAuthMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetAuthMocks();
});

it("throws BAD_REQUEST for invalid or expired reset token", async () => {
	mockResetPassword(false);

	const caller = createTestCaller();

	await expect(
		caller.auth.resetPassword({
			token: "invalid-token",
			newPassword: "newSecurePassword123",
		}),
	).rejects.toThrow(TRPCError);

	await expect(
		caller.auth.resetPassword({
			token: "invalid-token",
			newPassword: "newSecurePassword123",
		}),
	).rejects.toMatchObject({
		code: "BAD_REQUEST",
		message: "Invalid or expired reset token",
	});
});
