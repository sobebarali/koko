import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	mockInsertReturning,
	mockSelectOnce,
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

it("increments project.commentCount when creating a comment", async () => {
	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
	};

	const mockComment = {
		id: "comment_123",
		videoId: "video_123",
		authorId: "user_test",
		text: "Test comment",
		timecode: 5000,
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

	// Mock: Select video to verify it exists (should include projectId)
	mockSelectOnce([mockVideo]);

	// Mock: Transaction for insert comment and update counts
	const { transactionMock } = mockTransaction();
	mockInsertReturning([mockComment]);
	mockUpdateSimple();

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await caller.comment.create({
		videoId: "video_123",
		text: "Test comment",
		timecode: 5000,
	});

	// Verify transaction was called (it contains both video and project updates)
	expect(transactionMock).toHaveBeenCalled();
});
