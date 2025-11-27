import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	mockInsertReturning,
	mockSelectSequence,
	resetDbMocks,
} from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("uses custom name when provided", async () => {
	const sourceProject = {
		id: "project_123",
		name: "Test Project",
		description: "A test project",
		ownerId: "user_test",
		status: "active",
		color: "#ff0000",
		thumbnail: null,
		videoCount: 0,
		memberCount: 1,
		commentCount: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		archivedAt: null,
		deletedAt: null,
	};

	const sourceMember = {
		id: "member_1",
		projectId: "project_123",
		userId: "user_test",
		role: "owner",
		canUpload: true,
		canComment: true,
		canInvite: true,
		canDelete: true,
		invitedBy: null,
		joinedAt: new Date(),
	};

	const newProject = {
		id: "project_456",
		name: "My Custom Name",
		description: "A test project",
		ownerId: "user_test",
		status: "active",
		color: "#ff0000",
		thumbnail: null,
		videoCount: 0,
		memberCount: 1,
		commentCount: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	mockSelectSequence([
		[sourceProject],
		[{ role: "owner" }],
		[sourceMember],
		[], // no videos
		[], // no transcriptions
		[], // no scene detections
	]);

	mockInsertReturning([newProject]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.project.duplicate({
		id: "project_123",
		name: "My Custom Name",
	});

	expect(result.project.name).toBe("My Custom Name");
});
