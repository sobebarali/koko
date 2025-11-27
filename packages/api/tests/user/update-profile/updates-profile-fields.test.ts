import { afterAll, beforeAll, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import {
	cleanupTestDb,
	createTestDb,
	type TestClient,
	type TestDb,
} from "../../utils/test-db";
import { createTestUser } from "../../utils/test-fixtures";
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

it("updates provided profile fields", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "user@example.com",
		name: "Original Name",
		bio: "Original bio",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.user.updateProfile({
		name: "  Jane Doe ",
		bio: "Updated bio",
		website: "https://sobebar.online/",
	});

	// Verify the name was trimmed and the profile was updated
	expect(result.user.name).toBe("Jane Doe");
	expect(result.user.bio).toBe("Updated bio");
	expect(result.user.website).toBe("https://sobebar.online/");
});
