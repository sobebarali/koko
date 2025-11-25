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

it("returns Bunny storage upload instructions", async () => {
	mockUploadEnv({
		BUNNY_STORAGE_ZONE: "koko-media",
		BUNNY_STORAGE_ACCESS_KEY: "secret",
		BUNNY_STORAGE_ENDPOINT: "https://sg.storage.bunnycdn.com",
		BUNNY_STORAGE_CDN_URL: "https://cdn.koko.dev",
	});
	const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_730_000_000_000);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.user.uploadAvatar({
		fileName: "My Avatar.JPG",
		fileSize: 1024,
		mimeType: "image/jpeg",
	});

	expect(result).toEqual({
		uploadUrl:
			"https://sg.storage.bunnycdn.com/koko-media/avatars/user_test/1730000000000-my-avatar.jpg",
		uploadHeaders: {
			AccessKey: "secret",
			"Content-Type": "image/jpeg",
		},
		avatarUrl:
			"https://cdn.koko.dev/avatars/user_test/1730000000000-my-avatar.jpg",
	});

	nowSpy.mockRestore();
});
