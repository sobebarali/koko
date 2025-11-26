import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockVerifyEmail, resetAuthMocks } from "../../utils/mocks/auth";
import { createTestCaller } from "../../utils/testCaller";

beforeEach(() => resetAuthMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetAuthMocks();
});

it("throws BAD_REQUEST for invalid or expired token", async () => {
	mockVerifyEmail(false);

	const caller = createTestCaller();

	await expect(
		caller.auth.verifyEmail({ token: "invalid-token" }),
	).rejects.toThrow(TRPCError);
	await expect(
		caller.auth.verifyEmail({ token: "invalid-token" }),
	).rejects.toMatchObject({
		code: "BAD_REQUEST",
		message: "Invalid or expired verification token",
	});
});
