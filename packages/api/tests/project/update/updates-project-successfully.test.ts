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

it("updates project fields when user is owner", async () => {
	const existingProject = { ownerId: "user_test" };
	const updatedProject = {
		id: "project_123",
		name: "Updated Name",
		description: "Updated description",
		ownerId: "user_test",
		status: "active",
		color: "#00FF00",
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

	const result = await caller.project.update({
		id: "project_123",
		name: "Updated Name",
		description: "Updated description",
		color: "#00FF00",
	});

	expect(result.project.name).toBe("Updated Name");
	expect(result.project.description).toBe("Updated description");
});
