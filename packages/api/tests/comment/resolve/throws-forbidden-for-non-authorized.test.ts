import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectSequence, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws FORBIDDEN when user is neither author nor project owner", async () => {
	const existingComment = {
		id: "comment_1",
		videoId: "video_123",
		authorId: "other_user", // Not the current user
		deletedAt: null,
	};

	const mockVideo = {
		projectId: "project_123",
	};

	const mockProject = {
		ownerId: "another_user", // Also not the current user
	};

	// Mock: Select comment, then video, then project
	mockSelectSequence([[existingComment], [mockVideo], [mockProject]]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.resolve({
			id: "comment_1",
			resolved: true,
		}),
	).rejects.toThrow(
		"Only the comment author or project owner can resolve comments",
	);
});
