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

it("creates a new project and returns it", async () => {
	// Create a real user in the database
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.create({
		name: "Test Project",
		description: "A test project",
		color: "#FF5733",
	});

	expect(result.project.name).toBe("Test Project");
	expect(result.project.description).toBe("A test project");
	expect(result.project.ownerId).toBe(user.id);
	expect(result.project.color).toBe("#FF5733");
	expect(result.project.status).toBe("active");
	expect(result.project.videoCount).toBe(0);
	expect(result.project.memberCount).toBe(1);
});
