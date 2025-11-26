import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws BAD_REQUEST when trying to reply to a reply", async () => {
	const replyComment = {
		id: "reply_1",
		videoId: "video_123",
		authorId: "user_1",
		timecode: 5000,
		parentId: "comment_1", // This is already a reply
		deletedAt: null,
	};

	mockSelectSequence([[replyComment]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.reply({
			parentId: "reply_1",
			text: "Nested reply",
		}),
	).rejects.toThrow("Cannot reply to a reply");
});
