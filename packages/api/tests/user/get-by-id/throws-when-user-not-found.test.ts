import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectOnce, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws when public profile target is missing", async () => {
	mockSelectOnce([]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(caller.user.getById({ id: "missing_user" })).rejects.toThrow(
		"User not found",
	);
});
