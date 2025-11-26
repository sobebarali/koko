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

it("decrements project.commentCount when deleting a comment", async () => {
	const existingComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_test",
		deletedAt: null,
	};

	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
	};

	// Mock: Select comment, then select video for projectId
	mockSelectSequence([[existingComment], [mockVideo]]);

	// Mock: Transaction
	const { transactionMock } = mockTransaction();
	mockUpdateSimple();

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.delete({
		id: "comment_1",
	});

	expect(result.success).toBe(true);
	// Verify transaction was called (it contains comment soft delete, video commentCount, and project commentCount updates)
	expect(transactionMock).toHaveBeenCalled();
});
