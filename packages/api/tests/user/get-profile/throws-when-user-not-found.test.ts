import { afterAll, beforeAll, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import {
	cleanupTestDb,
	createTestDb,
	type TestClient,
	type TestDb,
} from "../../utils/test-db";
import { createTestCaller } from "../../utils/testCaller";
import { createTestSession } from "../../utils/testSession";

let db: TestDb;
let client: TestClient;

beforeAll(async () => {
	({ db, client } = await createTestDb());
	__setTestDb(db);
});

afterAll(async () => {
	__clearTestDb();
	await cleanupTestDb(client);
});

it("throws when current user profile is missing", async () => {
	// Create a session for a user that doesn't exist in the database
	const caller = createTestCaller({
		session: createTestSession({
			user: { id: "nonexistent_user", email: "nonexistent@example.com" },
		}),
	});

	await expect(caller.user.getProfile()).rejects.toThrow("User not found");
});
