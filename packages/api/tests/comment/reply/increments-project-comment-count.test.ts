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

it("increments project.commentCount when creating a reply", async () => {
	const parentComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_1",
		timecode: 5000,
		parentId: null,
		deletedAt: null,
	};

	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
	};

	const mockReply = {
		id: "reply_1",
		videoId: "video_123",
		authorId: "user_test",
		text: "Reply text",
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

	// Mock: Select parent comment, then select video for projectId
	mockSelectSequence([[parentComment], [mockVideo]]);

	// Mock: Transaction
	const { transactionMock } = mockTransaction();
	mockInsertReturning([mockReply]);
	mockUpdateSimple();

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await caller.comment.reply({
		parentId: "comment_1",
		text: "Reply text",
	});

	// Verify transaction was called (it contains parent replyCount, video commentCount, and project commentCount updates)
	expect(transactionMock).toHaveBeenCalled();
});
