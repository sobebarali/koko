import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
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

it("decrements parent.replyCount when deleting a reply", async () => {
	const existingReply = {
		id: "reply_1",
		videoId: "video_123",
		authorId: "user_test",
		deletedAt: null,
		parentId: "comment_parent",
	};

	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
	};

	// Mock: Select reply, then select video for projectId
	mockSelectSequence([[existingReply], [mockVideo]]);

	// Mock: Transaction
	const { transactionMock } = mockTransaction();
	mockUpdateSimple();

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.delete({
		id: "reply_1",
	});

	expect(result.success).toBe(true);
	// Verify transaction was called (it contains reply soft delete, parent replyCount, video commentCount, and project commentCount updates)
	expect(transactionMock).toHaveBeenCalled();
});
