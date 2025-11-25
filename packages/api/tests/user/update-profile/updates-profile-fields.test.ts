import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockUpdateOnce, resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("updates provided profile fields", async () => {
	const updatedProfile = {
		id: "user_test",
		email: "user@example.com",
		name: "Jane Doe",
		emailVerified: true,
		image: "avatar.png",
		bio: "Updated bio",
		title: "Editor",
		company: "Studio",
		location: "Remote",
		website: "https://example.com",
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
	const { setMock } = mockUpdateOnce([updatedProfile]);

	const caller = createTestCaller({
		session: createTestSession(),
	});

	const result = await caller.user.updateProfile({
		name: "  Jane Doe ",
		bio: "Updated bio",
	});

	expect(result).toEqual({ user: updatedProfile });
	expect(setMock).toHaveBeenCalledWith({
		name: "Jane Doe",
		bio: "Updated bio",
	});
});
