import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	mockSelectSequence,
	mockUpdateSimple,
	resetDbMocks,
} from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("soft deletes project when user is owner", async () => {
	const existingProject = { ownerId: "user_test", status: "active" };

	mockSelectSequence([[existingProject]]);
	const { updateMock } = mockUpdateSimple();

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.project.delete({ id: "project_123" });

	expect(result.success).toBe(true);
	expect(updateMock).toHaveBeenCalled();
});
