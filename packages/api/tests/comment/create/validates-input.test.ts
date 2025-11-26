import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws validation error when text is empty", async () => {
	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.create({
			videoId: "video_123",
			text: "",
			timecode: 1000,
		}),
	).rejects.toThrow();
});

it("throws validation error when timecode is negative", async () => {
	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.create({
			videoId: "video_123",
			text: "Test comment",
			timecode: -1,
		}),
	).rejects.toThrow();
});

it("throws validation error when videoId is empty", async () => {
	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.comment.create({
			videoId: "",
			text: "Test comment",
			timecode: 1000,
		}),
	).rejects.toThrow();
});
