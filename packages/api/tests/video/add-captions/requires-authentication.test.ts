import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("throws UNAUTHORIZED when no session", async () => {
	const caller = createTestCaller({ session: null });

	await expect(
		caller.video.addCaptions({
			id: "some-id",
			srclang: "en",
			captionFile: btoa("WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nTest"),
		}),
	).rejects.toThrow("Authentication required");
});
