import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns projects where user is a member with their role", async () => {
	const memberships = [{ projectId: "project_shared", role: "editor" }];

	const ownedProjects: unknown[] = [];

	const memberProjects = [
		{
			id: "project_shared",
			name: "Shared Project",
			description: "A shared project",
			ownerId: "other_user",
			status: "active",
			color: null,
			thumbnail: null,
			videoCount: 3,
			memberCount: 2,
			commentCount: 5,
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-01"),
		},
	];

	mockSelectSequence([memberships, ownedProjects, memberProjects]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.project.getAll({});

	expect(result.projects).toHaveLength(1);
	expect(result.projects[0]?.name).toBe("Shared Project");
	expect(result.projects[0]?.role).toBe("editor");
});
