import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockUploadEnv, resetDbMocks, resetEnv } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => {
	resetDbMocks();
	resetEnv();
});
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
	resetEnv();
});

it("throws when Bunny storage environment variables are missing", async () => {
	mockUploadEnv({
		BUNNY_STORAGE_ZONE: undefined,
		BUNNY_STORAGE_ACCESS_KEY: undefined,
		BUNNY_STORAGE_ENDPOINT: undefined,
		BUNNY_STORAGE_CDN_URL: undefined,
	});

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.user.uploadAvatar({
			fileName: "avatar.png",
			fileSize: 512,
			mimeType: "image/png",
		}),
	).rejects.toBeInstanceOf(TRPCError);
});
