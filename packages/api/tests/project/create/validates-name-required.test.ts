import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("validates that name is required and not empty", async () => {
	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.project.create({
			name: "",
		}),
	).rejects.toThrow();
});
