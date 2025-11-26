import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns comments with nested replies", async () => {
	const mockComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_1",
		text: "Parent comment",
		timecode: 1000,
		parentId: null,
		replyCount: 2,
		resolved: false,
		resolvedAt: null,
		resolvedBy: null,
		edited: false,
		editedAt: null,
		mentions: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		author: { id: "user_1", name: "User One", image: null },
	};

	const mockReplies = [
		{
			id: "reply_1",
			videoId: "video_123",
			authorId: "user_2",
			text: "First reply",
			timecode: 1000,
			parentId: "comment_1",
			replyCount: 0,
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
		{
			id: "reply_2",
			videoId: "video_123",
			authorId: "user_3",
			text: "Second reply",
			timecode: 1000,
			parentId: "comment_1",
			replyCount: 0,
			resolved: false,
			resolvedAt: null,
			resolvedBy: null,
			edited: false,
			editedAt: null,
			mentions: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			author: { id: "user_3", name: "User Three", image: null },
		},
	];

	mockSelectSequence([
		[{ id: "video_123" }], // Video exists
		[mockComment], // Top-level comments
		mockReplies, // Replies for comment_1
	]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.getAll({
		videoId: "video_123",
	});

	expect(result.comments).toHaveLength(1);
	expect(result.comments[0]?.replies).toHaveLength(2);
	expect(result.comments[0]?.replies[0]?.id).toBe("reply_1");
	expect(result.comments[0]?.replies[1]?.id).toBe("reply_2");
});
