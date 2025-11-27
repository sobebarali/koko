import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws FORBIDDEN when user is not the owner", async () => {
	const existingProject = { ownerId: "other_user", status: "active" };

	mockSelectSequence([[existingProject]]);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: "user_test", email: "test@example.com" },
		}),
	});

	await expect(caller.project.archive({ id: "project_123" })).rejects.toThrow(
		"Only the project owner can archive this project",
	);
});
