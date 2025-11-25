import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns project details when user is a member", async () => {
	const mockProject = {
		id: "project_123",
		name: "Test Project",
		description: "A test project",
		ownerId: "other_user",
		status: "active",
		color: "#FF5733",
		thumbnail: null,
		videoCount: 5,
		memberCount: 3,
		commentCount: 10,
		createdAt: new Date(),
		updatedAt: new Date(),
		archivedAt: null,
		deletedAt: null,
		owner: {
			id: "other_user",
			name: "Other User",
			image: null,
		},
	};

	const mockMembership = { id: "member_123" };

	mockSelectSequence([[mockProject], [mockMembership]]);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: "user_test", email: "test@example.com" },
		}),
	});

	const result = await caller.project.getById({ id: "project_123" });

	expect(result.project.id).toBe("project_123");
	expect(result.project.name).toBe("Test Project");
});
