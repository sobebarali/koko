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

it("returns the current user's profile", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "user@example.com",
		name: "Test User",
		image: "https://cdn.example.com/avatar.png",
		bio: "Maker",
		title: "Director",
		company: "Koko",
		location: "NYC",
		website: "https://koko.com",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.user.getProfile();

	expect(result.user.id).toBe(user.id);
	expect(result.user.email).toBe(user.email);
	expect(result.user.name).toBe(user.name);
	expect(result.user.bio).toBe("Maker");
	expect(result.user.title).toBe("Director");
	expect(result.user.company).toBe("Koko");
});
