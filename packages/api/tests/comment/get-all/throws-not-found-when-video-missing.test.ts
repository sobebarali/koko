import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectOnce, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws NOT_FOUND when video does not exist", async () => {
	mockSelectOnce([]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.getAll({
			videoId: "nonexistent_video",
		}),
	).rejects.toThrow("Video not found");
});
