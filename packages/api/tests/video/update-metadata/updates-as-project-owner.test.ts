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

it("updates video metadata when user is project owner", async () => {
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
		name: "Owner User",
	});

	const uploader = await createTestUser(db, {
		id: "uploader_user",
		email: "uploader@example.com",
		name: "Uploader User",
	});

	const project = await createTestProject(db, owner.id, {
		name: "Test Project",
	});

	const video = await createTestVideo(db, project.id, uploader.id, {
		title: "Original Title",
		status: "ready",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: owner.id, email: owner.email },
		}),
	});

	const result = await caller.video.updateMetadata({
		id: video.id,
		title: "Owner Updated",
	});

	expect(result.video.title).toBe("Owner Updated");
});
