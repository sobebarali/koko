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

it("soft deletes a comment and returns success", async () => {
	const existingComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_test",
		deletedAt: null,
	};

	mockSelectSequence([[existingComment]]);
	mockTransaction();
	mockUpdateSimple();

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.delete({
		id: "comment_1",
	});

	expect(result.success).toBe(true);
});
