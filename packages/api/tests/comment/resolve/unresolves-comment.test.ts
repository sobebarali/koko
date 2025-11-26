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

it("unresolves a previously resolved comment", async () => {
	const existingComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_test", // Current user is author
		deletedAt: null,
	};

	const unresolvedComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_test",
		text: "Comment text",
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
	};

	mockSelectSequence([[existingComment]]);
	mockUpdateOnce([unresolvedComment]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.resolve({
		id: "comment_1",
		resolved: false,
	});

	expect(result.comment.resolved).toBe(false);
	expect(result.comment.resolvedAt).toBeNull();
	expect(result.comment.resolvedBy).toBeNull();
});
