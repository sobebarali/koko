import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockSelectOnce, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("returns the current user's profile", async () => {
	const profile = {
		id: "user_test",
		email: "user@example.com",
		name: "Test User",
		emailVerified: true,
		image: "https://cdn.example.com/avatar.png",
		bio: "Maker",
		title: "Director",
		company: "Koko",
		location: "NYC",
		website: "https://koko.com",
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
	mockSelectOnce([profile]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.user.getProfile();

	expect(result).toEqual({ user: profile });
});
