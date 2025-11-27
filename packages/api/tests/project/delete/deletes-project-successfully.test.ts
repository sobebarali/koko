import { project } from "@koko/db/schema/index";
import { eq } from "drizzle-orm";
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

it("soft deletes project when user is owner", async () => {
	const user = await createTestUser(db, {
		id: "user_test",
		email: "test@example.com",
		name: "Test User",
	});

	const testProject = await createTestProject(db, user.id, {
		name: "Project to Delete",
		status: "active",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.project.delete({ id: testProject.id });

	expect(result.success).toBe(true);

	// Verify the project was soft-deleted in the database
	const deletedProject = await db.query.project.findFirst({
		where: eq(project.id, testProject.id),
	});
	expect(deletedProject?.status).toBe("deleted");
	expect(deletedProject?.deletedAt).not.toBeNull();
});
