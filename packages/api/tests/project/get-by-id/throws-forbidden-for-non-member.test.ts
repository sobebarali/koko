import { afterAll, beforeAll, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import {
	cleanupTestDb,
	createTestDb,
	type TestClient,
	type TestDb,
} from "../../utils/test-db";
import { createTestProject, createTestUser } from "../../utils/test-fixtures";
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

it("throws FORBIDDEN when user is not owner or member", async () => {
	// Create project owner
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
		name: "Owner User",
	});

	// Create a random user who is not a member
	const randomUser = await createTestUser(db, {
		id: "random_user",
		email: "random@example.com",
		name: "Random User",
	});

	// Create project (only owner is a member)
	const project = await createTestProject(db, owner.id, {
		name: "Test Project",
		description: "A test project",
	});

	// Try to access as non-member
	const caller = createTestCaller({
		session: createTestSession({
			user: { id: randomUser.id, email: randomUser.email },
		}),
	});

	await expect(caller.project.getById({ id: project.id })).rejects.toThrow(
		"You do not have access to this project",
	);
});
