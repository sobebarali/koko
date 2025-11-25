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

	await expect(caller.project.getById({ id: "project_123" })).rejects.toThrow(
		"Authentication required",
	);
});
