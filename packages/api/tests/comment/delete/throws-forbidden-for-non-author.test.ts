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
		videoId: "video_123",
		authorId: "other_user",
		deletedAt: null,
	};

	mockSelectSequence([[existingComment]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.delete({
			id: "comment_1",
		}),
	).rejects.toThrow("You can only delete your own comments");
});
