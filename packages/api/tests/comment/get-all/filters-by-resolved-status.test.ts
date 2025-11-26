import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("filters to show only resolved comments", async () => {
	const resolvedComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "user_1",
		text: "Resolved comment",
		timecode: 1000,
		parentId: null,
		replyCount: 0,
		resolved: true,
		resolvedAt: new Date(),
		resolvedBy: "user_1",
		edited: false,
		editedAt: null,
		mentions: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		author: { id: "user_1", name: "User One", image: null },
	};

	mockSelectSequence([
		[{ id: "video_123" }], // Video exists
		[resolvedComment], // Only resolved comments returned
	]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.getAll({
		videoId: "video_123",
		resolved: "resolved",
	});

	expect(result.comments).toHaveLength(1);
	expect(result.comments[0]?.resolved).toBe(true);
});

it("filters to show only unresolved comments", async () => {
	const unresolvedComment = {
		id: "comment_2",
		videoId: "video_123",
		authorId: "user_2",
		text: "Unresolved comment",
		timecode: 2000,
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
		author: { id: "user_2", name: "User Two", image: null },
	};

	mockSelectSequence([
		[{ id: "video_123" }], // Video exists
		[unresolvedComment], // Only unresolved comments returned
	]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.comment.getAll({
		videoId: "video_123",
		resolved: "unresolved",
	});

	expect(result.comments).toHaveLength(1);
	expect(result.comments[0]?.resolved).toBe(false);
});
