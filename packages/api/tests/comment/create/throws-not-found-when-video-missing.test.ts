import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectOnce, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws NOT_FOUND when video does not exist", async () => {
	// Mock: Video not found
	mockSelectOnce([]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.create({
			videoId: "nonexistent_video",
			text: "Test comment",
			timecode: 1000,
		}),
	).rejects.toThrow("Video not found");
});
