import { afterAll, beforeAll, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import {
	cleanupTestDb,
	createTestDb,
	type TestClient,
	type TestDb,
} from "../../utils/test-db";
import {
	addProjectMember,
	createTestProject,
	createTestUser,
} from "../../utils/test-fixtures";
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

it("returns project details when user is a member", async () => {
	// Create project owner
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
		name: "Owner User",
	});

	// Create member user
	const member = await createTestUser(db, {
		id: "member_user",
		email: "member@example.com",
		name: "Member User",
	});

	// Create project
	const project = await createTestProject(db, {
		ownerId: owner.id,
		name: "Test Project",
		description: "A test project",
		color: "#FF5733",
	});

	// Add member to project
	await addProjectMember(db, project.id, member.id, {
		role: "viewer",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: member.id, email: member.email },
		}),
	});

	const result = await caller.project.getById({ id: project.id });

	expect(result.project.id).toBe(project.id);
	expect(result.project.name).toBe("Test Project");
	expect(result.project.ownerId).toBe(owner.id);
});
