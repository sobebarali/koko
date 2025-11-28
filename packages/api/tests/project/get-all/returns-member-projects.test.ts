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

it("returns projects where user is a member with their role", async () => {
	// Create project owner
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
		name: "Owner User",
	});

	// Create the member user
	const member = await createTestUser(db, {
		id: "member_user",
		email: "member@example.com",
		name: "Member User",
	});

	// Create a project owned by another user
	const project = await createTestProject(db, {
		ownerId: owner.id,
		name: "Shared Project",
		description: "A shared project",
	});

	// Add the member user to the project with editor role
	await addProjectMember(db, project.id, member.id, {
		role: "editor",
		canUpload: true,
		canComment: true,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: member.id, email: member.email },
		}),
	});

	const result = await caller.project.getAll({});

	expect(result.projects).toHaveLength(1);
	expect(result.projects[0]?.name).toBe("Shared Project");
	expect(result.projects[0]?.role).toBe("editor");
});
