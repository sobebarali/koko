import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	mockInsertReturning,
	mockSelectSequence,
	mockTransaction,
	mockUpdateSimple,
	resetDbMocks,
} from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("creates a reply to a comment", async () => {
	const parentComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_1",
		timecode: 5000,
		parentId: null,
		deletedAt: null,
	};

	const mockReply = {
		id: "reply_1",
		videoId: "video_123",
		authorId: "user_test",
		text: "This is a reply",
		timecode: 5000,
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
	};

	// Mock: Select parent comment
	mockSelectSequence([[parentComment]]);

	// Mock: Transaction
	mockTransaction();
	mockInsertReturning([mockReply]);
	mockUpdateSimple();

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.reply({
		parentId: "comment_1",
		text: "This is a reply",
	});

	expect(result.comment.id).toBe("reply_1");
	expect(result.comment.parentId).toBe("comment_1");
	expect(result.comment.videoId).toBe("video_123");
	expect(result.comment.timecode).toBe(5000);
	expect(result.comment.text).toBe("This is a reply");
});
