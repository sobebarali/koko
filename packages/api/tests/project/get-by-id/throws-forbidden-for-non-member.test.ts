import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws FORBIDDEN when user is not owner or member", async () => {
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

	mockSelectSequence([[mockProject], []]);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: "user_test", email: "test@example.com" },
		}),
	});

	await expect(caller.project.getById({ id: "project_123" })).rejects.toThrow(
		"You do not have access to this project",
	);
});
