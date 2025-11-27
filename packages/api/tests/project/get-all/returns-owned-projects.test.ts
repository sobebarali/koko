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

it("returns projects owned by the user", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	// Create two projects owned by the user
	await createTestProject(db, user.id, {
		name: "Project One",
		description: "First project",
	});

	await createTestProject(db, user.id, {
		name: "Project Two",
		description: "Second project",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.getAll({});

	expect(result.projects).toHaveLength(2);
	// Projects should be returned (order may vary)
	const projectNames = result.projects.map((p) => p.name);
	expect(projectNames).toContain("Project One");
	expect(projectNames).toContain("Project Two");
});
