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

it("deletes multiple videos when user is owner", async () => {
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
	});

	const project = await createTestProject(db, {
		ownerId: owner.id,
		name: "Test Project",
	});

	const video1 = await createTestVideo(db, project.id, owner.id, {
		title: "Test Video 1",
		status: "ready",
	});

	const video2 = await createTestVideo(db, project.id, owner.id, {
		title: "Test Video 2",
		status: "ready",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: owner.id, email: owner.email },
		}),
	});

	const result = await caller.video.bulkDelete({
		ids: [video1.id, video2.id],
	});

	expect(result.deleted).toHaveLength(2);
	expect(result.deleted).toContain(video1.id);
	expect(result.deleted).toContain(video2.id);
	expect(result.failed).toHaveLength(0);
});
