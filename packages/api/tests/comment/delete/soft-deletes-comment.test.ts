import { afterAll, beforeAll, expect, it } from "vitest";
import { __clearTestDb, __setTestDb } from "../../setup";
import {
	cleanupTestDb,
	createTestDb,
	type TestClient,
	type TestDb,
} from "../../utils/test-db";
import {
	createTestComment,
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

it("soft deletes a comment and returns success", async () => {
	const user = await createTestUser(db);
	const project = await createTestProject(db, user.id);
	const video = await createTestVideo(db, project.id, user.id);

	const testComment = await createTestComment(db, video.id, user.id, {
		text: "Test comment",
		timecode: 1000,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.comment.delete({
		id: testComment.id,
	});

	expect(result.success).toBe(true);
});
