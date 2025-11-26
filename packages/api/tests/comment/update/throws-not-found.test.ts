import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws NOT_FOUND when comment does not exist", async () => {
	mockSelectSequence([[]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.update({
			id: "nonexistent_comment",
			text: "Updated text",
		}),
	).rejects.toThrow("Comment not found");
});

it("throws NOT_FOUND when comment is deleted", async () => {
	const deletedComment = {
		id: "comment_1",
		authorId: "user_test",
		deletedAt: new Date(),
	};

	mockSelectSequence([[deletedComment]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.update({
			id: "comment_1",
			text: "Updated text",
		}),
	).rejects.toThrow("Comment not found");
});
