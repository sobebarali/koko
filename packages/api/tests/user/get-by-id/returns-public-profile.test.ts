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

it("returns a public profile for getById", async () => {
	const requestingUser = await createTestUser(db, {
		id: "requesting_user",
		email: "requesting@example.com",
		name: "Requesting User",
	});

	const otherUser = await createTestUser(db, {
		id: "other_user",
		email: "other@example.com",
		name: "Other User",
		image: "https://cdn.example.com/other.png",
		bio: "Producer",
		title: "Lead",
		company: "Studio",
		location: "SF",
		website: "https://other.example.com",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: requestingUser.id, email: requestingUser.email },
		}),
	});

	const result = await caller.user.getById({ id: otherUser.id });

	expect(result.user.id).toBe(otherUser.id);
	expect(result.user.name).toBe("Other User");
	expect(result.user.bio).toBe("Producer");
	expect(result.user.title).toBe("Lead");
	expect(result.user.company).toBe("Studio");
});
