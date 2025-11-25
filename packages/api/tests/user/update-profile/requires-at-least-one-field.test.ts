import { db } from "@koko/db";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetDbMocks } from "../../utils/mocks/db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

type MutableDb = {
	update: (...args: unknown[]) => unknown;
};

const mutableDb = db as unknown as MutableDb;

beforeEach(() => resetDbMocks());
afterEach(() => {
	vi.restoreAllMocks();
	resetDbMocks();
});

it("requires at least one profile field", async () => {
	const updateMock = vi.fn();
	mutableDb.update = updateMock;

	const caller = createTestCaller({
		session: createTestSession(),
	});

	await expect(
		// @ts-expect-error - testing runtime validation
		caller.user.updateProfile({}),
	).rejects.toThrow("At least one field must be provided.");
	expect(updateMock).not.toHaveBeenCalled();
});
