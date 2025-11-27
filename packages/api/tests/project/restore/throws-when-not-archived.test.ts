import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws BAD_REQUEST when project is not archived", async () => {
	const existingProject = { ownerId: "user_test", status: "active" };

	mockSelectSequence([[existingProject]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(caller.project.restore({ id: "project_123" })).rejects.toThrow(
		"Project is not archived",
	);
});
