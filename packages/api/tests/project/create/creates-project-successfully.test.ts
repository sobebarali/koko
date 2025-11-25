import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockInsertReturning, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("creates a new project and returns it", async () => {
	const mockProject = {
		id: "project_123",
		name: "Test Project",
		description: "A test project",
		ownerId: "user_test",
		status: "active",
		color: "#FF5733",
		thumbnail: null,
		videoCount: 0,
		memberCount: 1,
		commentCount: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const { insertMock } = mockInsertReturning([mockProject]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.project.create({
		name: "Test Project",
		description: "A test project",
		color: "#FF5733",
	});

	expect(result.project.name).toBe("Test Project");
	expect(result.project.description).toBe("A test project");
	expect(result.project.ownerId).toBe("user_test");
	expect(insertMock).toHaveBeenCalled();
});
