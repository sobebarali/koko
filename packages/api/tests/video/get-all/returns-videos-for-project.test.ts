import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns videos for project when user is owner", async () => {
	const mockProject = { id: "project_123", ownerId: "user_test" };
	const mockVideos = [
		{
			id: "video_1",
			projectId: "project_123",
			uploadedBy: "user_test",
			bunnyVideoId: "bunny_1",
			title: "Video 1",
			thumbnailUrl: "https://thumb.bunny.net/1",
			duration: 120,
			status: "ready",
			viewCount: 100,
			createdAt: new Date("2024-01-02"),
		},
		{
			id: "video_2",
			projectId: "project_123",
			uploadedBy: "user_test",
			bunnyVideoId: "bunny_2",
			title: "Video 2",
			thumbnailUrl: "https://thumb.bunny.net/2",
			duration: 60,
			status: "ready",
			viewCount: 50,
			createdAt: new Date("2024-01-01"),
		},
	];

	// First select: project exists, user is owner
	// Second select: videos
	mockSelectSequence([[mockProject], mockVideos]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.video.getAll({ projectId: "project_123" });

	expect(result.videos).toHaveLength(2);
	expect(result.videos[0]?.title).toBe("Video 1");
	expect(result.videos[1]?.title).toBe("Video 2");
});

it("returns empty array when no videos exist", async () => {
	const mockProject = { id: "project_123", ownerId: "user_test" };

	mockSelectSequence([[mockProject], []]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.video.getAll({ projectId: "project_123" });

	expect(result.videos).toHaveLength(0);
	expect(result.nextCursor).toBeUndefined();
});
