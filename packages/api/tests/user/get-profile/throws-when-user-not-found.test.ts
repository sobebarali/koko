import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectOnce, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws when current user profile is missing", async () => {
	mockSelectOnce([]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(caller.user.getProfile()).rejects.toThrow("User not found");
});
