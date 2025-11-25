import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns projects owned by the user", async () => {
	const mockProjects = [
		{
			id: "project_1",
			name: "Project One",
			description: "First project",
			ownerId: "user_test",
			status: "active",
			color: null,
			thumbnail: null,
			videoCount: 0,
			memberCount: 1,
			commentCount: 0,
			createdAt: new Date("2024-01-02"),
			updatedAt: new Date("2024-01-02"),
		},
		{
			id: "project_2",
			name: "Project Two",
			description: "Second project",
			ownerId: "user_test",
			status: "active",
			color: null,
			thumbnail: null,
			videoCount: 0,
			memberCount: 1,
			commentCount: 0,
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-01"),
		},
	];

	mockSelectSequence([[], mockProjects, []]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.project.getAll({});

	expect(result.projects).toHaveLength(2);
	expect(result.projects[0]?.name).toBe("Project One");
	expect(result.projects[1]?.name).toBe("Project Two");
});
