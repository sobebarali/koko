import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import { mockVideoEnv, resetVideoEnv } from "../../utils/mocks/db";
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

beforeEach(() => {
	mockVideoEnv({
		BUNNY_API_KEY: "test-api-key",
		BUNNY_LIBRARY_ID: "test-library-id",
	});
});

afterEach(() => {
	resetVideoEnv();
});

it("throws NOT_FOUND when project does not exist", async () => {
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

	await expect(
		caller.video.createUpload({
			projectId: "non_existent_project",
			title: "Test Video",
			fileName: "test.mp4",
			fileSize: 1024000,
			mimeType: "video/mp4",
		}),
	).rejects.toThrow("Project not found");
});
