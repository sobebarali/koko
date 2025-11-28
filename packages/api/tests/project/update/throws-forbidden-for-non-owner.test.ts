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

it("throws FORBIDDEN when user is not the owner", async () => {
	// Create the project owner
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
		name: "Owner User",
	});

	// Create another user who is not the owner
	const otherUser = await createTestUser(db, {
		id: "other_user",
		email: "other@example.com",
		name: "Other User",
	});

	// Create a project owned by owner
	const project = await createTestProject(db, {
		ownerId: owner.id,
		name: "Test Project",
	});

	// Try to update as non-owner
	const caller = createTestCaller({
		session: createTestSession({
			user: { id: otherUser.id, email: otherUser.email },
		}),
	});

	await expect(
		caller.project.update({
			id: project.id,
			name: "Updated Name",
		}),
	).rejects.toThrow("Only the project owner can update this project");
});
