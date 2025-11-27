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
	const sourceProject = {
		id: "project_123",
		name: "Test Project",
		description: null,
		ownerId: "other_user",
		status: "active",
		color: null,
		thumbnail: null,
		videoCount: 0,
		memberCount: 1,
		commentCount: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		archivedAt: null,
		deletedAt: null,
	};

	// Mock: project exists but user is not owner and not a member
	mockSelectSequence([
		[sourceProject],
		[], // empty membership - user is not a member
	]);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: "user_test", email: "test@example.com" },
		}),
	});

	await expect(caller.project.duplicate({ id: "project_123" })).rejects.toThrow(
		"Only project owner or members can duplicate this project",
	);
});
