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

it("throws FORBIDDEN when member does not have upload permission", async () => {
	const mockProject = { id: "project_123", ownerId: "other_user" };
	const mockMembership = { id: "member_123", canUpload: false };

	// First select: project exists but owned by another user
	// Second select: membership found but canUpload is false
	mockSelectSequence([[mockProject], [mockMembership]]);

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
	).rejects.toThrow("You do not have permission to upload videos");
});
