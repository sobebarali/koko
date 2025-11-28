import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import { mockVideoEnv, resetVideoEnv } from "../../utils/mocks/db";
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

beforeEach(() => {
	mockVideoEnv({
		BUNNY_API_KEY: "test-api-key",
		BUNNY_LIBRARY_ID: "test-library-id",
	});
});

afterEach(() => {
	resetVideoEnv();
});

it("throws FORBIDDEN when user is not a project member", async () => {
	const owner = await createTestUser(db, {
		id: "owner_user",
		email: "owner@example.com",
		name: "Owner User",
	});

	const otherUser = await createTestUser(db, {
		id: "other_user",
		email: "other@example.com",
		name: "Other User",
	});

	const project = await createTestProject(db, {
		ownerId: owner.id,
		name: "Test Project",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: otherUser.id, email: otherUser.email },
		}),
	});

	await expect(
		caller.video.createUpload({
			projectId: project.id,
			title: "Test Video",
			fileName: "test.mp4",
			fileSize: 1024000,
			mimeType: "video/mp4",
		}),
	).rejects.toThrow("You do not have access to this project");
});
