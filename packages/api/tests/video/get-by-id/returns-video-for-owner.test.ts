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

it("returns video when user is the project owner", async () => {
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
		name: "Owner User",
	});

	const project = await createTestProject(db, owner.id, {
		name: "Test Project",
	});

	const video = await createTestVideo(db, project.id, owner.id, {
		title: "Test Video",
		description: "A test video",
		status: "ready",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: owner.id, email: owner.email },
		}),
	});

	const result = await caller.video.getById({ id: video.id });

	expect(result.video.id).toBe(video.id);
	expect(result.video.title).toBe("Test Video");
	expect(result.video.status).toBe("ready");
});
