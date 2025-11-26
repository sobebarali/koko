import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws FORBIDDEN when user is not the comment author", async () => {
	const existingComment = {
		id: "comment_1",
		authorId: "other_user", // Different from user_test
		deletedAt: null,
	};

	mockSelectSequence([[existingComment]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.update({
			id: "comment_1",
			text: "Updated text",
		}),
	).rejects.toThrow("You can only edit your own comments");
});
