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

it("resolves a comment when user is the author", async () => {
	const existingComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_test", // Current user is author
		deletedAt: null,
	};

	const resolvedComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_test",
		text: "Comment text",
		timecode: 1000,
		parentId: null,
		replyCount: 0,
		resolved: true,
		resolvedAt: new Date(),
		resolvedBy: "user_test",
		edited: false,
		editedAt: null,
		mentions: [],
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	// Mock: Select comment (author check - passes, so no video/project lookup needed)
	mockSelectSequence([[existingComment]]);
	mockUpdateOnce([resolvedComment]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.resolve({
		id: "comment_1",
		resolved: true,
	});

	expect(result.comment.resolved).toBe(true);
	expect(result.comment.resolvedBy).toBe("user_test");
});
