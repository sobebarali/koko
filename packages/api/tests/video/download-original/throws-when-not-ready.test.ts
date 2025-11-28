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

it("throws BAD_REQUEST when video is not ready", async () => {
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
	});

	const project = await createTestProject(db, {
		ownerId: owner.id,
		name: "Test Project",
	});

	const video = await createTestVideo(db, project.id, owner.id, {
		title: "Test Video",
		status: "processing",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: owner.id, email: owner.email },
		}),
	});

	await expect(caller.video.downloadOriginal({ id: video.id })).rejects.toThrow(
		"Video is not ready for download",
	);
});
