import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectOnce, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns a public profile for getById", async () => {
	const publicProfile = {
		id: "other_user",
		name: "Other User",
		image: "https://cdn.example.com/other.png",
		bio: "Producer",
		title: "Lead",
		company: "Studio",
		location: "SF",
		website: "https://other.example.com",
	};
	mockSelectOnce([publicProfile]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.user.getById({ id: "other_user" });

	expect(result).toEqual({ user: publicProfile });
});
