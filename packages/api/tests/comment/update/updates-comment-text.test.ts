import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	mockSelectSequence,
	mockUpdateOnce,
	resetDbMocks,
} from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("updates comment text and sets edited flag", async () => {
	const existingComment = {
		id: "comment_1",
		authorId: "user_test",
		deletedAt: null,
	};

	const updatedComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_test",
		text: "Updated text",
		timecode: 1000,
		parentId: null,
		replyCount: 0,
		resolved: false,
		resolvedAt: null,
		resolvedBy: null,
		edited: true,
		editedAt: new Date(),
		mentions: [],
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	mockSelectSequence([[existingComment]]);
	mockUpdateOnce([updatedComment]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.update({
		id: "comment_1",
		text: "Updated text",
	});

	expect(result.comment.text).toBe("Updated text");
	expect(result.comment.edited).toBe(true);
});
