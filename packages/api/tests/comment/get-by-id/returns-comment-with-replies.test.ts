import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns a comment with its replies", async () => {
	const mockComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_1",
		text: "Parent comment",
		timecode: 1000,
		parentId: null,
		replyCount: 1,
		resolved: false,
		resolvedAt: null,
		resolvedBy: null,
		edited: false,
		editedAt: null,
		mentions: [],
		deletedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		author: { id: "user_1", name: "User One", image: null },
	};

	const mockReply = {
		id: "reply_1",
		videoId: "video_123",
		authorId: "user_2",
		text: "A reply",
		timecode: 1000,
		parentId: "comment_1",
		replyCount: 0,
		resolved: false,
		resolvedAt: null,
		resolvedBy: null,
		edited: false,
		editedAt: null,
		mentions: [],
		deletedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		author: { id: "user_2", name: "User Two", image: null },
	};

	mockSelectSequence([
		[mockComment], // Comment found
		[mockReply], // Replies
	]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.getById({
		id: "comment_1",
	});

	expect(result.comment.id).toBe("comment_1");
	expect(result.comment.text).toBe("Parent comment");
	expect(result.comment.replies).toHaveLength(1);
	expect(result.comment.replies[0]?.id).toBe("reply_1");
});
