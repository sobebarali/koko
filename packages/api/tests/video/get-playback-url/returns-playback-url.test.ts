import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns playback URL when video is ready", async () => {
	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
		status: "ready",
		bunnyVideoId: "bunny_video_abc",
		bunnyLibraryId: "bunny_lib_xyz",
		thumbnailUrl: "https://thumb.bunny.net/123.jpg",
		project: { ownerId: "user_test" },
	};

	mockSelectSequence([[mockVideo]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.video.getPlaybackUrl({ id: "video_123" });

	expect(result.playbackUrl).toBe(
		"https://iframe.mediadelivery.net/embed/bunny_lib_xyz/bunny_video_abc",
	);
	expect(result.thumbnailUrl).toBe("https://thumb.bunny.net/123.jpg");
});

it("throws BAD_REQUEST when video is not ready", async () => {
	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
		status: "processing",
		bunnyVideoId: "bunny_video_abc",
		bunnyLibraryId: "bunny_lib_xyz",
		thumbnailUrl: null,
		project: { ownerId: "user_test" },
	};

	mockSelectSequence([[mockVideo]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.video.getPlaybackUrl({ id: "video_123" }),
	).rejects.toThrow("Video is not ready for playback");
});
