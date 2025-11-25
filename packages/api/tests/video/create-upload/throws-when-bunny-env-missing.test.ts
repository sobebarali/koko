import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	mockVideoEnv,
	resetDbMocks,
	resetVideoEnv,
} from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => {
	resetDbMocks();
	// Clear the env variables
	mockVideoEnv({
		BUNNY_API_KEY: undefined,
		BUNNY_LIBRARY_ID: undefined,
	});
});
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
	resetVideoEnv();
});

it("throws INTERNAL_SERVER_ERROR when Bunny API key is missing", async () => {
	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.video.createUpload({
			projectId: "project_123",
			title: "Test Video",
			fileName: "test.mp4",
			fileSize: 1024000,
			mimeType: "video/mp4",
		}),
	).rejects.toThrow("Video storage is not configured");
});
