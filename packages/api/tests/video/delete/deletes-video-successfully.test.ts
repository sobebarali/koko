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

it("soft deletes video when user is uploader", async () => {
	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
		uploadedBy: "user_test",
		deletedAt: null,
		project: { ownerId: "other_owner" },
	};

	mockSelectSequence([[mockVideo]]);
	const { updateMock } = mockUpdateSimple();

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.video.delete({ id: "video_123" });

	expect(result.success).toBe(true);
	expect(updateMock).toHaveBeenCalled();
});

it("soft deletes video when user is project owner", async () => {
	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
		uploadedBy: "other_user",
		deletedAt: null,
		project: { ownerId: "user_test" },
	};

	mockSelectSequence([[mockVideo]]);
	const { updateMock } = mockUpdateSimple();

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.video.delete({ id: "video_123" });

	expect(result.success).toBe(true);
	expect(updateMock).toHaveBeenCalled();
});
