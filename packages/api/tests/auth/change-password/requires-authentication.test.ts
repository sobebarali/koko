import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetAuthMocks } from "../../utils/mocks/auth";
import { createTestCaller } from "../../utils/testCaller";

beforeEach(() => resetAuthMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetAuthMocks();
});

it("requires authentication to change password", async () => {
	// No session provided
	const caller = createTestCaller();

	await expect(
		caller.auth.changePassword({
			currentPassword: "oldPassword123",
			newPassword: "newSecurePassword456",
		}),
	).rejects.toThrow(TRPCError);

	await expect(
		caller.auth.changePassword({
			currentPassword: "oldPassword123",
			newPassword: "newSecurePassword456",
		}),
	).rejects.toMatchObject({
		code: "UNAUTHORIZED",
	});
});
