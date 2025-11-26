import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns top-level comments for a video ordered by timecode", async () => {
	const mockComments = [
		{
			id: "comment_1",
			videoId: "video_123",
			authorId: "user_1",
			text: "First comment",
			timecode: 1000,
			parentId: null,
			replyCount: 0,
			resolved: false,
			resolvedAt: null,
			resolvedBy: null,
			edited: false,
			editedAt: null,
			mentions: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			author: { id: "user_1", name: "User One", image: null },
		},
		{
			id: "comment_2",
			videoId: "video_123",
			authorId: "user_2",
			text: "Second comment",
			timecode: 5000,
			parentId: null,
			replyCount: 1,
			resolved: false,
			resolvedAt: null,
			resolvedBy: null,
			edited: false,
			editedAt: null,
			mentions: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			author: { id: "user_2", name: "User Two", image: null },
		},
	];

	// Mock: First select for video existence check
	mockSelectSequence([
		[{ id: "video_123" }], // Video exists
		mockComments, // Top-level comments
		[], // Replies for comment_1
		[], // Replies for comment_2
	]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.getAll({
		videoId: "video_123",
	});

	expect(result.comments).toHaveLength(2);
	expect(result.comments[0]?.id).toBe("comment_1");
	expect(result.comments[0]?.timecode).toBe(1000);
	expect(result.comments[1]?.id).toBe("comment_2");
	expect(result.comments[1]?.timecode).toBe(5000);
});
