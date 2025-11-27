import { afterAll, beforeAll, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import {
	cleanupTestDb,
	createTestDb,
	type TestClient,
	type TestDb,
} from "../../utils/test-db";
import {
	createTestProject,
	createTestUser,
	createTestVideo,
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

it("fails to delete videos when user has no permission", async () => {
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
	});

	const nonMember = await createTestUser(db, {
		id: "non_member_user",
		email: "nonmember@example.com",
	});

	const project = await createTestProject(db, owner.id, {
		name: "Test Project",
	});

	const video = await createTestVideo(db, project.id, owner.id, {
		title: "Test Video",
		status: "ready",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: nonMember.id, email: nonMember.email },
		}),
	});

	const result = await caller.video.bulkDelete({ ids: [video.id] });

	expect(result.deleted).toHaveLength(0);
	expect(result.failed).toHaveLength(1);
	expect(result.failed[0]?.reason).toBe(
		"You do not have permission to delete this video",
	);
});
