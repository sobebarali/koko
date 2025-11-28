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

it("returns project details when user is the owner", async () => {
	// Create a real user and project in the database
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	const project = await createTestProject(db, {
		ownerId: user.id,
		name: "Test Project",
		description: "A test project",
		color: "#FF5733",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.getById({ id: project.id });

	expect(result.project.id).toBe(project.id);
	expect(result.project.name).toBe("Test Project");
	expect(result.project.ownerId).toBe(user.id);
	expect(result.project.description).toBe("A test project");
	expect(result.project.owner.id).toBe(user.id);
	expect(result.project.owner.name).toBe("Test User");
});
