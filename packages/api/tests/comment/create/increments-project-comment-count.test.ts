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

it("increments project.commentCount when creating a comment", async () => {
	const user = await createTestUser(db);
	const testProject = await createTestProject(db, { ownerId: user.id });
	const video = await createTestVideo(db, testProject.id, user.id);

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const projectBefore = await caller.project.getById({ id: testProject.id });
	const commentCountBefore = projectBefore.project.commentCount;

	await caller.comment.create({
		videoId: video.id,
		text: "Test comment",
		timecode: 5000,
	});

	const projectAfter = await caller.project.getById({ id: testProject.id });
	const commentCountAfter = projectAfter.project.commentCount;

	expect(commentCountAfter).toBe(commentCountBefore + 1);
});
