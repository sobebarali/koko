import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws NOT_FOUND when comment is deleted", async () => {
	const deletedComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_1",
		text: "Deleted comment",
		timecode: 1000,
		parentId: null,
		replyCount: 0,
		resolved: false,
		resolvedAt: null,
		resolvedBy: null,
		edited: false,
		editedAt: null,
		mentions: [],
		deletedAt: new Date(), // Comment is soft-deleted
		createdAt: new Date(),
		updatedAt: new Date(),
		author: { id: "user_1", name: "User One", image: null },
	};

	mockSelectSequence([[deletedComment]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.getById({
			id: "comment_1",
		}),
	).rejects.toThrow("Comment not found");
});
