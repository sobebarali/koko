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

it("creates a reply to a comment", async () => {
	const user = await createTestUser(db);
	const project = await createTestProject(db, user.id);
	const video = await createTestVideo(db, project.id, user.id);

	const parentComment = await createTestComment(db, video.id, user.id, {
		text: "Parent comment",
		timecode: 5000,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	const result = await caller.comment.reply({
		parentId: parentComment.id,
		text: "This is a reply",
	});

	expect(result.comment.parentId).toBe(parentComment.id);
	expect(result.comment.videoId).toBe(video.id);
	expect(result.comment.timecode).toBe(5000);
	expect(result.comment.text).toBe("This is a reply");
});
