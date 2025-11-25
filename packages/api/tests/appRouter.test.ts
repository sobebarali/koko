import { describe, expect, it } from "vitest";
import { createTestCaller } from "./utils/testCaller";
import { createTestSession } from "./utils/testSession";

describe("appRouter", () => {
	it("returns OK for health check", async () => {
		const caller = createTestCaller();
		const result = await caller.healthCheck();

		expect(result).toBe("OK");
	});

	it("rejects private data access without a session", async () => {
		const caller = createTestCaller();

		await expect(caller.privateData()).rejects.toThrow(
			"Authentication required",
		);
	});

	it("returns private data for authenticated users", async () => {
		const caller = createTestCaller({
			session: createTestSession(),
		});

		const result = await caller.privateData();

		expect(result).toMatchObject({
			message: "This is private",
			user: {
				id: "user_test",
				email: "user@example.com",
			},
		});
	});
});
