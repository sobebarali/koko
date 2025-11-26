import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws NOT_FOUND when parent comment does not exist", async () => {
	mockSelectSequence([[]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.reply({
			parentId: "nonexistent_comment",
			text: "Reply text",
		}),
	).rejects.toThrow("Parent comment not found");
});
