import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns video when user is the project owner", async () => {
	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
		uploadedBy: "other_user",
		bunnyVideoId: "bunny_123",
		bunnyLibraryId: "lib_123",
		title: "Test Video",
		description: "A test video",
		tags: ["tag1", "tag2"],
		originalFileName: "test.mp4",
		fileSize: 1024000,
		mimeType: "video/mp4",
		duration: 120,
		width: 1920,
		height: 1080,
		fps: 30,
		status: "ready",
		processingProgress: 100,
		errorMessage: null,
		streamingUrl: "https://stream.bunny.net/123",
		thumbnailUrl: "https://thumb.bunny.net/123",
		viewCount: 100,
		commentCount: 5,
		versionNumber: 1,
		parentVideoId: null,
		isCurrentVersion: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		project: {
			ownerId: "user_test",
		},
	};

	// First select: video found, user is project owner
	mockSelectSequence([[mockVideo]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.video.getById({ id: "video_123" });

	expect(result.video.id).toBe("video_123");
	expect(result.video.title).toBe("Test Video");
	expect(result.video.status).toBe("ready");
	expect(result.video.streamingUrl).toBe("https://stream.bunny.net/123");
});

it("returns video when user is a project member", async () => {
	const mockVideo = {
		id: "video_456",
		projectId: "project_123",
		uploadedBy: "other_user",
		bunnyVideoId: "bunny_456",
		bunnyLibraryId: "lib_123",
		title: "Member Video",
		description: "A member's video",
		tags: [],
		originalFileName: "member.mp4",
		fileSize: 2048000,
		mimeType: "video/mp4",
		duration: 240,
		width: 1280,
		height: 720,
		fps: 24,
		status: "ready",
		processingProgress: 100,
		errorMessage: null,
		streamingUrl: "https://stream.bunny.net/456",
		thumbnailUrl: "https://thumb.bunny.net/456",
		viewCount: 50,
		commentCount: 2,
		versionNumber: 1,
		parentVideoId: null,
		isCurrentVersion: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		project: {
			ownerId: "other_owner",
		},
	};

	const mockMembership = { id: "member_123" };

	// First select: video found, user is NOT project owner
	// Second select: user has membership
	mockSelectSequence([[mockVideo], [mockMembership]]);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: "user_test", email: "test@example.com" },
		}),
	});

	const result = await caller.video.getById({ id: "video_456" });

	expect(result.video.id).toBe("video_456");
	expect(result.video.title).toBe("Member Video");
});
