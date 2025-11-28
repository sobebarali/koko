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

	const video = await createTestVideo(db, project.id, owner.id, {
		title: "Test Video",
		status: "ready",
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: otherUser.id, email: otherUser.email },
		}),
	});

	await expect(caller.video.getById({ id: video.id })).rejects.toThrow(
		"You do not have access to this video",
	);
});
