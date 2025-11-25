import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws FORBIDDEN when user is not a project member", async () => {
	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
		uploadedBy: "other_user",
		bunnyVideoId: "bunny_123",
		title: "Test Video",
		description: "A test video",
		tags: [],
		originalFileName: "test.mp4",
		fileSize: 1024000,
		mimeType: "video/mp4",
		duration: 120,
		width: 1920,
		height: 1080,
		fps: 30,
		status: "ready",
		streamingUrl: "https://stream.bunny.net/123",
		thumbnailUrl: "https://thumb.bunny.net/123",
		viewCount: 100,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		project: {
			ownerId: "other_owner",
		},
	};

	// First select: video found with project info
	// Second select: no membership found
	mockSelectSequence([[mockVideo], []]);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: "user_test", email: "test@example.com" },
		}),
	});

	await expect(caller.video.getById({ id: "video_123" })).rejects.toThrow(
		"You do not have access to this video",
	);
});
