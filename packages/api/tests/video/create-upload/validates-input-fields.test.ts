import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("validates that title is required and not empty", async () => {
	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.video.createUpload({
			projectId: "project_123",
			title: "",
			fileName: "test.mp4",
			fileSize: 1024000,
			mimeType: "video/mp4",
		}),
	).rejects.toThrow();
});

it("validates that mimeType must be a video type", async () => {
	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.video.createUpload({
			projectId: "project_123",
			title: "Test Video",
			fileName: "test.mp4",
			fileSize: 1024000,
			mimeType: "image/png",
		}),
	).rejects.toThrow();
});

it("validates that fileSize must be positive", async () => {
	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.video.createUpload({
			projectId: "project_123",
			title: "Test Video",
			fileName: "test.mp4",
			fileSize: -100,
			mimeType: "video/mp4",
		}),
	).rejects.toThrow();
});
