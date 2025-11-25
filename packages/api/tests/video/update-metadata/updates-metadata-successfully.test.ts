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

it("updates video metadata when user is uploader", async () => {
	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
		uploadedBy: "user_test",
		project: { ownerId: "other_owner" },
	};

	const updatedVideo = {
		id: "video_123",
		title: "Updated Title",
		description: "Updated description",
		tags: ["tag1", "tag2"],
		updatedAt: new Date(),
	};

	mockSelectSequence([[mockVideo]]);
	mockUpdateOnce([updatedVideo]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.video.updateMetadata({
		id: "video_123",
		title: "Updated Title",
		description: "Updated description",
		tags: ["tag1", "tag2"],
	});

	expect(result.video.title).toBe("Updated Title");
	expect(result.video.description).toBe("Updated description");
	expect(result.video.tags).toEqual(["tag1", "tag2"]);
});

it("updates video metadata when user is project owner", async () => {
	const mockVideo = {
		id: "video_123",
		projectId: "project_123",
		uploadedBy: "other_user",
		project: { ownerId: "user_test" },
	};

	const updatedVideo = {
		id: "video_123",
		title: "Owner Updated",
		description: null,
		tags: [],
		updatedAt: new Date(),
	};

	mockSelectSequence([[mockVideo]]);
	mockUpdateOnce([updatedVideo]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.video.updateMetadata({
		id: "video_123",
		title: "Owner Updated",
	});

	expect(result.video.title).toBe("Owner Updated");
});
