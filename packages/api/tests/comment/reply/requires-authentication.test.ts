import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws UNAUTHORIZED when no session", async () => {
	const caller = createTestCaller({
		session: null,
	});

	await expect(
		caller.comment.reply({
			parentId: "comment_1",
			text: "Reply text",
		}),
	).rejects.toThrow("Authentication required");
});
