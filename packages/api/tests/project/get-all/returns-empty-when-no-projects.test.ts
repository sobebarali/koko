import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns empty array when user has no projects", async () => {
	mockSelectSequence([[], [], []]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.project.getAll({});

	expect(result.projects).toHaveLength(0);
	expect(result.nextCursor).toBeUndefined();
});
