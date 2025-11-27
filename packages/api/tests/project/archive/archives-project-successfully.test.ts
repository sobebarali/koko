import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	mockSelectSequence,
	mockUpdateOnce,
	resetDbMocks,
} from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("archives project when user is owner", async () => {
	const existingProject = { ownerId: "user_test", status: "active" };
	const updatedProject = {
		id: "project_123",
		name: "Test Project",
		description: null,
		ownerId: "user_test",
		status: "archived",
		color: null,
		thumbnail: null,
		videoCount: 0,
		memberCount: 1,
		commentCount: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	mockSelectSequence([[existingProject]]);
	mockUpdateOnce([updatedProject]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.project.archive({ id: "project_123" });

	expect(result.project.status).toBe("archived");
	expect(result.project.id).toBe("project_123");
});
