import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("validates that at least one field must be provided", async () => {
	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		caller.project.update({
			id: "project_123",
		}),
	).rejects.toThrow("At least one field must be provided to update");
});
