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

it("creates a new comment and returns it", async () => {
	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
	};

	const mockComment = {
		id: "comment_123",
		videoId: "video_123",
		authorId: "user_test",
		text: "This is a test comment",
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

	// Mock: First select video to verify it exists
	mockSelectOnce([mockVideo]);

	// Mock: Transaction for insert comment and update video commentCount
	mockTransaction();
	mockInsertReturning([mockComment]);
	mockUpdateSimple();

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.create({
		videoId: "video_123",
		text: "This is a test comment",
		timecode: 5000,
	});

	expect(result.comment.id).toBe("comment_123");
	expect(result.comment.videoId).toBe("video_123");
	expect(result.comment.authorId).toBe("user_test");
	expect(result.comment.text).toBe("This is a test comment");
	expect(result.comment.timecode).toBe(5000);
	expect(result.comment.parentId).toBeNull();
	expect(result.comment.resolved).toBe(false);
});
