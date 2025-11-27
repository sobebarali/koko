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

it("throws BAD_REQUEST when trying to reply to a reply", async () => {
	const user = await createTestUser(db);
	const project = await createTestProject(db, user.id);
	const video = await createTestVideo(db, project.id, user.id);

	const parentComment = await createTestComment(db, video.id, user.id, {
		text: "Parent comment",
		timecode: 5000,
	});

	const replyComment = await createTestComment(db, video.id, user.id, {
		text: "First reply",
		timecode: 5000,
		parentId: parentComment.id,
	});

	const caller = createTestCaller({
		session: createTestSession({
			user: { id: user.id, email: user.email },
		}),
	});

	await expect(
		caller.comment.reply({
			parentId: replyComment.id,
			text: "Nested reply",
		}),
	).rejects.toThrow("Cannot reply to a reply");
});
