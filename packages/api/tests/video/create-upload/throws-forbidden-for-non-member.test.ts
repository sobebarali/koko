import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	mockSelectSequence,
	mockVideoEnv,
	resetDbMocks,
	resetVideoEnv,
} from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => {
	resetDbMocks();
	mockVideoEnv({
		BUNNY_API_KEY: "test-api-key",
		BUNNY_LIBRARY_ID: "test-library-id",
	});
});
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
	resetVideoEnv();
});

it("throws FORBIDDEN when user is not a project member", async () => {
	const mockProject = { id: "project_123", ownerId: "other_user" };

	// First select: project exists but owned by another user
	// Second select: no membership found
	mockSelectSequence([[mockProject], []]);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: "user_test", email: "test@example.com" },
		}),
	});

	await expect(
		caller.video.createUpload({
			projectId: "project_123",
			title: "Test Video",
			fileName: "test.mp4",
			fileSize: 1024000,
			mimeType: "video/mp4",
		}),
	).rejects.toThrow("You do not have access to this project");
});
