import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws NOT_FOUND when parent comment is deleted", async () => {
	const deletedParent = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_1",
		timecode: 5000,
		parentId: null,
		deletedAt: new Date(), // Soft-deleted
	};

	mockSelectSequence([[deletedParent]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.reply({
			parentId: "comment_1",
			text: "Reply text",
		}),
	).rejects.toThrow("Parent comment not found");
});
