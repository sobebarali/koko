import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockChangePassword, resetAuthMocks } from "../../utils/mocks/auth";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetAuthMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetAuthMocks();
});

it("throws BAD_REQUEST for incorrect current password", async () => {
	mockChangePassword(false);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.auth.changePassword({
			currentPassword: "wrongPassword",
			newPassword: "newSecurePassword456",
		}),
	).rejects.toThrow(TRPCError);

	await expect(
		caller.auth.changePassword({
			currentPassword: "wrongPassword",
			newPassword: "newSecurePassword456",
		}),
	).rejects.toMatchObject({
		code: "BAD_REQUEST",
		message: "Invalid current password",
	});
});
